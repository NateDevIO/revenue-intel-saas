"""
Model Prediction Module
=======================

Provides inference capabilities for churn prediction:
- Single customer prediction
- Batch predictions
- Prediction explanations using SHAP
- Threshold optimization
"""

import pickle
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import pandas as pd
import numpy as np
import re

try:
    import shap
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False

from data.database import query_to_df
from .train import ChurnModelTrainer, MODEL_DIR


def validate_customer_id(customer_id: str) -> bool:
    """Validate customer ID format to prevent SQL injection."""
    pattern = r'^CUST_[A-Z0-9]{8}$'
    return bool(re.match(pattern, customer_id))


def validate_segment(segment: str, segment_value: str) -> tuple:
    """Validate segment field and value to prevent SQL injection."""
    # Whitelist segment fields
    valid_segments = ['company_size', 'industry', 'channel']
    if segment not in valid_segments:
        raise ValueError(f"Invalid segment field. Must be one of: {', '.join(valid_segments)}")

    # Whitelist segment values by type
    valid_values = {
        'company_size': ['SMB', 'Mid-Market', 'Enterprise'],
        'industry': ['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail', 'Other'],
        'channel': ['Direct', 'Partner', 'Self-Service']
    }

    if segment_value not in valid_values.get(segment, []):
        raise ValueError(f"Invalid {segment} value. Must be one of: {', '.join(valid_values.get(segment, []))}")

    return segment, segment_value


class ChurnPredictor:
    """Provides churn predictions with explanations."""

    def __init__(self):
        self.trainer = ChurnModelTrainer()
        self.model_loaded = self.trainer.load_model()
        self.explainer = None

        if self.model_loaded and HAS_SHAP:
            try:
                self.explainer = shap.TreeExplainer(self.trainer.model)
            except:
                pass

    def predict_single(self, customer_id: str) -> Dict[str, Any]:
        """
        Get churn prediction for a single customer.

        Returns probability, risk level, and explanation.
        """
        # Validate customer ID
        if not validate_customer_id(customer_id):
            return {'error': 'Invalid customer ID format'}

        if not self.model_loaded:
            return self._fallback_prediction(customer_id)

        # Get customer features
        features = self._get_customer_features(customer_id)

        if features is None:
            return {'error': 'Customer not found'}

        # Prepare feature vector
        X = self._prepare_features(features)

        # Get prediction
        proba = self.trainer.model.predict_proba(X)[0, 1]

        # Get explanation
        explanation = self._explain_prediction(X, features)

        # Determine risk level
        risk_level = self._get_risk_level(proba)

        return {
            'customer_id': customer_id,
            'churn_probability': float(proba),
            'risk_level': risk_level,
            'confidence': self._get_confidence(proba),
            'explanation': explanation,
            'top_risk_factors': explanation[:3] if explanation else [],
            'recommended_action': self._get_recommended_action(proba, explanation)
        }

    def predict_batch(self, customer_ids: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Get churn predictions for multiple customers.

        If customer_ids is None, predicts for all active customers.
        """
        if customer_ids is None:
            query = "SELECT customer_id FROM customers WHERE status = 'Active'"
            df = query_to_df(query)
            customer_ids = df['customer_id'].tolist()

        results = []
        for cid in customer_ids:
            pred = self.predict_single(cid)
            results.append(pred)

        # Sort by probability descending
        results.sort(key=lambda x: x.get('churn_probability', 0), reverse=True)

        return results

    def _fallback_prediction(self, customer_id: str) -> Dict[str, Any]:
        """Fallback prediction using simple rules when model not available."""
        # Get customer data directly from database
        query = f"""
            SELECT
                c.customer_id,
                c.company_size,
                c.current_mrr,
                c.churn_probability,
                c.health_score,
                c.latest_nps_score
            FROM customers c
            WHERE c.customer_id = '{customer_id}'
            AND c.status = 'Active'
        """
        df = query_to_df(query)

        if df.empty:
            return {'error': 'Customer not found'}

        row = df.iloc[0]

        # Use stored probability or calculate simple one
        if row['churn_probability']:
            proba = float(row['churn_probability'])
        else:
            # Simple rule-based probability
            proba = 0.3
            if row['health_score'] == 'Red':
                proba += 0.3
            elif row['health_score'] == 'Yellow':
                proba += 0.15
            if row['latest_nps_score'] and row['latest_nps_score'] <= 6:
                proba += 0.2

        risk_level = self._get_risk_level(proba)

        return {
            'customer_id': customer_id,
            'churn_probability': proba,
            'risk_level': risk_level,
            'confidence': 'Low (fallback model)',
            'explanation': [
                {'factor': 'Health Score', 'impact': 'High' if row['health_score'] == 'Red' else 'Medium'},
                {'factor': 'NPS Score', 'impact': 'High' if row['latest_nps_score'] and row['latest_nps_score'] <= 6 else 'Low'}
            ],
            'top_risk_factors': ['Health Score', 'NPS Score'],
            'recommended_action': self._get_recommended_action(proba, [])
        }

    def _get_customer_features(self, customer_id: str) -> Optional[pd.Series]:
        """Get feature values for a customer."""
        query = f"""
            SELECT
                c.customer_id,
                c.company_size,
                c.industry,
                c.channel,
                c.initial_mrr,
                c.current_mrr,
                c.latest_nps_score,
                DATEDIFF('day', c.start_date, CURRENT_DATE) as tenure_days
            FROM customers c
            WHERE c.customer_id = '{customer_id}'
            AND c.status = 'Active'
        """
        customer_df = query_to_df(query)

        if customer_df.empty:
            return None

        # Get usage features
        usage_query = f"""
            SELECT
                AVG(logins) as avg_logins,
                AVG(api_calls) as avg_api_calls,
                AVG(reports_generated) as avg_reports,
                AVG(team_members_active) as avg_team_active,
                STDDEV(logins) as std_logins
            FROM usage_events
            WHERE customer_id = '{customer_id}'
            AND event_date >= CURRENT_DATE - INTERVAL 60 DAY
        """
        usage_df = query_to_df(usage_query)

        # Get usage trend
        trend_query = f"""
            SELECT
                AVG(CASE WHEN event_date >= CURRENT_DATE - INTERVAL 14 DAY THEN logins END) as recent_logins,
                AVG(CASE WHEN event_date < CURRENT_DATE - INTERVAL 14 DAY
                          AND event_date >= CURRENT_DATE - INTERVAL 28 DAY THEN logins END) as prior_logins
            FROM usage_events
            WHERE customer_id = '{customer_id}'
            AND event_date >= CURRENT_DATE - INTERVAL 28 DAY
        """
        trend_df = query_to_df(trend_query)

        # Get MRR movements
        mrr_query = f"""
            SELECT
                SUM(CASE WHEN movement_type = 'Expansion' THEN 1 ELSE 0 END) as expansion_count,
                SUM(CASE WHEN movement_type = 'Contraction' THEN 1 ELSE 0 END) as contraction_count
            FROM mrr_movements
            WHERE customer_id = '{customer_id}'
        """
        mrr_df = query_to_df(mrr_query)

        # Combine features
        features = customer_df.iloc[0].to_dict()

        if not usage_df.empty:
            features.update(usage_df.iloc[0].to_dict())

        if not trend_df.empty:
            trend = trend_df.iloc[0]
            recent = trend['recent_logins'] or 0
            prior = trend['prior_logins'] or 1
            features['usage_trend'] = (recent - prior) / prior if prior > 0 else 0

        if not mrr_df.empty:
            features.update(mrr_df.iloc[0].to_dict())

        # Calculate derived features
        if features.get('initial_mrr', 0) > 0:
            features['mrr_change'] = (features.get('current_mrr', 0) - features['initial_mrr']) / features['initial_mrr']
        else:
            features['mrr_change'] = 0

        # NPS category
        nps = features.get('latest_nps_score')
        if nps is None:
            features['nps_category'] = 'Passive'
        elif nps >= 9:
            features['nps_category'] = 'Promoter'
        elif nps >= 7:
            features['nps_category'] = 'Passive'
        else:
            features['nps_category'] = 'Detractor'

        return pd.Series(features)

    def _prepare_features(self, features: pd.Series) -> np.ndarray:
        """Prepare feature vector for prediction."""
        # Encode categorical features
        encoded = features.copy()

        for col, encoder in self.trainer.label_encoders.items():
            if col in encoded.index:
                try:
                    encoded[f'{col}_encoded'] = encoder.transform([str(encoded[col])])[0]
                except:
                    encoded[f'{col}_encoded'] = 0

        # Get feature columns
        feature_cols = self.trainer.get_feature_columns()
        available = [f for f in feature_cols if f in encoded.index]

        # Build feature vector
        X = pd.DataFrame([encoded[available]]).fillna(0)

        # Scale
        X_scaled = self.trainer.scaler.transform(X)

        return X_scaled

    def _explain_prediction(
        self,
        X: np.ndarray,
        features: pd.Series
    ) -> List[Dict[str, Any]]:
        """Generate explanation for prediction using SHAP."""
        explanation = []

        if self.explainer and HAS_SHAP:
            try:
                shap_values = self.explainer.shap_values(X)

                # Handle different SHAP output formats
                if isinstance(shap_values, list):
                    shap_values = shap_values[1]  # Get positive class

                feature_names = self.trainer.get_feature_columns()
                available_names = [f for f in feature_names if f in features.index or f.replace('_encoded', '') in features.index]

                for i, (name, shap_val) in enumerate(zip(available_names, shap_values[0])):
                    if abs(shap_val) > 0.01:  # Only significant factors
                        # Get original value
                        original_name = name.replace('_encoded', '')
                        value = features.get(original_name, features.get(name, 'N/A'))

                        explanation.append({
                            'factor': self._format_feature_name(name),
                            'value': value,
                            'shap_value': float(shap_val),
                            'impact': 'Increases risk' if shap_val > 0 else 'Decreases risk',
                            'magnitude': 'High' if abs(shap_val) > 0.1 else 'Medium' if abs(shap_val) > 0.05 else 'Low'
                        })

                # Sort by absolute SHAP value
                explanation.sort(key=lambda x: abs(x['shap_value']), reverse=True)

            except Exception as e:
                pass

        # Fallback to rule-based explanation
        if not explanation:
            explanation = self._rule_based_explanation(features)

        return explanation[:5]  # Return top 5

    def _rule_based_explanation(self, features: pd.Series) -> List[Dict[str, Any]]:
        """Generate rule-based explanation when SHAP not available."""
        explanation = []

        # Check usage
        if features.get('avg_logins', 0) < 5:
            explanation.append({
                'factor': 'Low Login Activity',
                'value': f"{features.get('avg_logins', 0):.1f} avg/day",
                'impact': 'Increases risk',
                'magnitude': 'High'
            })

        # Check usage trend
        if features.get('usage_trend', 0) < -0.2:
            explanation.append({
                'factor': 'Declining Usage',
                'value': f"{features.get('usage_trend', 0):.1%}",
                'impact': 'Increases risk',
                'magnitude': 'High'
            })

        # Check NPS
        nps = features.get('latest_nps_score')
        if nps is not None and nps <= 6:
            explanation.append({
                'factor': 'Low NPS Score',
                'value': nps,
                'impact': 'Increases risk',
                'magnitude': 'High'
            })

        # Check tenure
        if features.get('tenure_days', 0) < 90:
            explanation.append({
                'factor': 'New Customer',
                'value': f"{features.get('tenure_days', 0)} days",
                'impact': 'Increases risk',
                'magnitude': 'Medium'
            })

        # Check MRR change
        if features.get('mrr_change', 0) < 0:
            explanation.append({
                'factor': 'Revenue Decline',
                'value': f"{features.get('mrr_change', 0):.1%}",
                'impact': 'Increases risk',
                'magnitude': 'Medium'
            })

        return explanation

    def _format_feature_name(self, name: str) -> str:
        """Convert feature name to readable format."""
        mapping = {
            'tenure_days': 'Account Tenure',
            'initial_mrr': 'Initial MRR',
            'current_mrr': 'Current MRR',
            'avg_logins': 'Average Logins',
            'avg_api_calls': 'API Usage',
            'avg_reports': 'Report Generation',
            'avg_team_active': 'Active Team Size',
            'std_logins': 'Login Consistency',
            'usage_trend': 'Usage Trend',
            'mrr_change': 'Revenue Change',
            'expansion_count': 'Expansions',
            'contraction_count': 'Contractions',
            'latest_nps_score': 'NPS Score',
            'company_size_encoded': 'Company Size',
            'industry_encoded': 'Industry',
            'channel_encoded': 'Acquisition Channel',
            'nps_category_encoded': 'NPS Category'
        }
        return mapping.get(name, name.replace('_', ' ').title())

    def _get_risk_level(self, probability: float) -> str:
        """Determine risk level from probability."""
        if probability >= 0.7:
            return 'Critical'
        elif probability >= 0.5:
            return 'High'
        elif probability >= 0.3:
            return 'Medium'
        else:
            return 'Low'

    def _get_confidence(self, probability: float) -> str:
        """Estimate prediction confidence."""
        # Confidence is higher when probability is extreme
        if probability < 0.15 or probability > 0.85:
            return 'High'
        elif probability < 0.3 or probability > 0.7:
            return 'Medium'
        else:
            return 'Low'

    def _get_recommended_action(
        self,
        probability: float,
        explanation: List[Dict]
    ) -> str:
        """Generate recommended action based on prediction."""
        if probability >= 0.7:
            return "Immediate executive outreach required"
        elif probability >= 0.5:
            return "Schedule urgent customer success call"
        elif probability >= 0.3:
            return "Proactive check-in recommended"
        else:
            return "Continue standard engagement"


def get_predictions_for_segment(
    segment: str,
    segment_value: str,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """Get predictions for customers in a specific segment."""
    # Validate segment and value
    segment, segment_value = validate_segment(segment, segment_value)

    predictor = ChurnPredictor()

    query = f"""
        SELECT customer_id
        FROM customers
        WHERE status = 'Active'
        AND {segment} = '{segment_value}'
    """
    df = query_to_df(query)

    if df.empty:
        return []

    customer_ids = df['customer_id'].tolist()[:limit]
    return predictor.predict_batch(customer_ids)


def get_high_risk_customers(
    threshold: float = 0.5,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """Get customers with churn probability above threshold."""
    predictor = ChurnPredictor()
    all_predictions = predictor.predict_batch()

    high_risk = [p for p in all_predictions if p.get('churn_probability', 0) >= threshold]
    return high_risk[:limit]
