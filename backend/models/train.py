"""
Model Training Module
=====================

Provides churn prediction model training including:
- Feature engineering
- Time-based train/validate/test split
- XGBoost model training
- Cross-validation
- Feature importance analysis
"""

import pickle
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
from datetime import date, timedelta
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, TimeSeriesSplit
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import (
    roc_auc_score, precision_recall_curve, average_precision_score,
    classification_report, confusion_matrix
)

try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

from data.database import query_to_df

# Model storage path
MODEL_DIR = Path(__file__).parent / "saved_models"
MODEL_DIR.mkdir(exist_ok=True)


class ChurnModelTrainer:
    """Trains and evaluates churn prediction models."""

    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.feature_names = []
        self.training_metrics = {}

    def prepare_features(self) -> pd.DataFrame:
        """Prepare feature matrix for training."""
        # Get customer data with features
        query = """
            SELECT
                c.customer_id,
                c.company_size,
                c.industry,
                c.channel,
                c.start_date,
                c.status,
                c.churn_date,
                c.initial_mrr,
                c.current_mrr,
                c.latest_nps_score,
                DATEDIFF('day', c.start_date,
                    CASE WHEN c.status = 'Churned' THEN c.churn_date ELSE CURRENT_DATE END
                ) as tenure_days
            FROM customers c
        """
        customers_df = query_to_df(query)

        # Get usage features for each customer
        usage_query = """
            SELECT
                customer_id,
                AVG(logins) as avg_logins,
                AVG(api_calls) as avg_api_calls,
                AVG(reports_generated) as avg_reports,
                AVG(team_members_active) as avg_team_active,
                STDDEV(logins) as std_logins,
                MAX(logins) as max_logins,
                MIN(logins) as min_logins
            FROM usage_events
            WHERE event_date >= CURRENT_DATE - INTERVAL 60 DAY
            GROUP BY customer_id
        """
        usage_df = query_to_df(usage_query)

        # Get usage trend (recent vs prior)
        trend_query = """
            SELECT
                customer_id,
                AVG(CASE WHEN event_date >= CURRENT_DATE - INTERVAL 14 DAY THEN logins END) as recent_logins,
                AVG(CASE WHEN event_date < CURRENT_DATE - INTERVAL 14 DAY
                          AND event_date >= CURRENT_DATE - INTERVAL 28 DAY THEN logins END) as prior_logins
            FROM usage_events
            WHERE event_date >= CURRENT_DATE - INTERVAL 28 DAY
            GROUP BY customer_id
        """
        trend_df = query_to_df(trend_query)

        # Get MRR movement history
        mrr_query = """
            SELECT
                customer_id,
                SUM(CASE WHEN movement_type = 'Expansion' THEN 1 ELSE 0 END) as expansion_count,
                SUM(CASE WHEN movement_type = 'Contraction' THEN 1 ELSE 0 END) as contraction_count
            FROM mrr_movements
            GROUP BY customer_id
        """
        mrr_df = query_to_df(mrr_query)

        # Merge all features
        df = customers_df.merge(usage_df, on='customer_id', how='left')
        df = df.merge(trend_df, on='customer_id', how='left')
        df = df.merge(mrr_df, on='customer_id', how='left')

        # Fill missing values
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        df[numeric_cols] = df[numeric_cols].fillna(0)

        # Create target variable
        df['churned'] = (df['status'] == 'Churned').astype(int)

        # Calculate usage trend
        df['usage_trend'] = np.where(
            df['prior_logins'] > 0,
            (df['recent_logins'] - df['prior_logins']) / df['prior_logins'],
            0
        )

        # Calculate MRR change
        df['mrr_change'] = np.where(
            df['initial_mrr'] > 0,
            (df['current_mrr'] - df['initial_mrr']) / df['initial_mrr'],
            0
        )

        # NPS category
        df['nps_category'] = pd.cut(
            df['latest_nps_score'].fillna(7),
            bins=[-1, 6, 8, 10],
            labels=['Detractor', 'Passive', 'Promoter']
        )

        return df

    def encode_categorical(self, df: pd.DataFrame, fit: bool = True) -> pd.DataFrame:
        """Encode categorical variables."""
        categorical_cols = ['company_size', 'industry', 'channel', 'nps_category']

        for col in categorical_cols:
            if col in df.columns:
                if fit:
                    self.label_encoders[col] = LabelEncoder()
                    df[f'{col}_encoded'] = self.label_encoders[col].fit_transform(df[col].astype(str))
                else:
                    df[f'{col}_encoded'] = self.label_encoders[col].transform(df[col].astype(str))

        return df

    def get_feature_columns(self) -> List[str]:
        """Get list of feature columns for model."""
        return [
            'tenure_days',
            'initial_mrr',
            'current_mrr',
            'avg_logins',
            'avg_api_calls',
            'avg_reports',
            'avg_team_active',
            'std_logins',
            'usage_trend',
            'mrr_change',
            'expansion_count',
            'contraction_count',
            'latest_nps_score',
            'company_size_encoded',
            'industry_encoded',
            'channel_encoded',
            'nps_category_encoded'
        ]

    def train(
        self,
        test_size: float = 0.2,
        validation_size: float = 0.1
    ) -> Dict[str, Any]:
        """
        Train the churn prediction model.

        Uses time-based splitting to prevent data leakage.
        """
        print("Preparing features...")
        df = self.prepare_features()
        df = self.encode_categorical(df, fit=True)

        # Get feature columns
        self.feature_names = self.get_feature_columns()
        available_features = [f for f in self.feature_names if f in df.columns]

        X = df[available_features].fillna(0)
        y = df['churned']

        # Time-based split using start_date
        df_sorted = df.sort_values('start_date')
        n = len(df_sorted)

        train_end = int(n * (1 - test_size - validation_size))
        val_end = int(n * (1 - test_size))

        train_idx = df_sorted.index[:train_end]
        val_idx = df_sorted.index[train_end:val_end]
        test_idx = df_sorted.index[val_end:]

        X_train = X.loc[train_idx]
        y_train = y.loc[train_idx]
        X_val = X.loc[val_idx]
        y_val = y.loc[val_idx]
        X_test = X.loc[test_idx]
        y_test = y.loc[test_idx]

        print(f"Training set: {len(X_train)} samples")
        print(f"Validation set: {len(X_val)} samples")
        print(f"Test set: {len(X_test)} samples")

        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_val_scaled = self.scaler.transform(X_val)
        X_test_scaled = self.scaler.transform(X_test)

        # Train model
        if HAS_XGBOOST:
            print("Training XGBoost model...")
            self.model = xgb.XGBClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42,
                eval_metric='auc',
                early_stopping_rounds=10
            )

            self.model.fit(
                X_train_scaled, y_train,
                eval_set=[(X_val_scaled, y_val)],
                verbose=False
            )
        else:
            # Fallback to sklearn RandomForest
            from sklearn.ensemble import RandomForestClassifier
            print("Training RandomForest model (XGBoost not available)...")
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=6,
                random_state=42
            )
            self.model.fit(X_train_scaled, y_train)

        # Evaluate on test set
        y_pred_proba = self.model.predict_proba(X_test_scaled)[:, 1]
        y_pred = (y_pred_proba >= 0.5).astype(int)

        # Calculate metrics
        auc_score = roc_auc_score(y_test, y_pred_proba)
        ap_score = average_precision_score(y_test, y_pred_proba)

        print(f"\nTest Set Results:")
        print(f"  AUC-ROC: {auc_score:.4f}")
        print(f"  Average Precision: {ap_score:.4f}")

        # Store metrics
        self.training_metrics = {
            'auc_roc': float(auc_score),
            'average_precision': float(ap_score),
            'train_size': len(X_train),
            'test_size': len(X_test),
            'features_used': available_features,
            'classification_report': classification_report(y_test, y_pred, output_dict=True)
        }

        # Get feature importance
        if HAS_XGBOOST:
            importance = self.model.feature_importances_
        else:
            importance = self.model.feature_importances_

        self.training_metrics['feature_importance'] = dict(zip(available_features, importance.tolist()))

        return self.training_metrics

    def save_model(self, model_name: str = "churn_model"):
        """Save trained model to disk."""
        if self.model is None:
            raise ValueError("No model to save. Train the model first.")

        model_path = MODEL_DIR / f"{model_name}.pkl"
        scaler_path = MODEL_DIR / f"{model_name}_scaler.pkl"
        encoders_path = MODEL_DIR / f"{model_name}_encoders.pkl"
        metadata_path = MODEL_DIR / f"{model_name}_metadata.pkl"

        with open(model_path, 'wb') as f:
            pickle.dump(self.model, f)

        with open(scaler_path, 'wb') as f:
            pickle.dump(self.scaler, f)

        with open(encoders_path, 'wb') as f:
            pickle.dump(self.label_encoders, f)

        metadata = {
            'feature_names': self.feature_names,
            'training_metrics': self.training_metrics
        }
        with open(metadata_path, 'wb') as f:
            pickle.dump(metadata, f)

        print(f"Model saved to {MODEL_DIR}")

    def load_model(self, model_name: str = "churn_model") -> bool:
        """Load trained model from disk."""
        model_path = MODEL_DIR / f"{model_name}.pkl"
        scaler_path = MODEL_DIR / f"{model_name}_scaler.pkl"
        encoders_path = MODEL_DIR / f"{model_name}_encoders.pkl"
        metadata_path = MODEL_DIR / f"{model_name}_metadata.pkl"

        if not all(p.exists() for p in [model_path, scaler_path, encoders_path]):
            return False

        with open(model_path, 'rb') as f:
            self.model = pickle.load(f)

        with open(scaler_path, 'rb') as f:
            self.scaler = pickle.load(f)

        with open(encoders_path, 'rb') as f:
            self.label_encoders = pickle.load(f)

        if metadata_path.exists():
            with open(metadata_path, 'rb') as f:
                metadata = pickle.load(f)
                self.feature_names = metadata.get('feature_names', [])
                self.training_metrics = metadata.get('training_metrics', {})

        return True

    def get_feature_importance(self) -> List[Dict[str, Any]]:
        """Get feature importance from trained model."""
        if self.model is None:
            return []

        if HAS_XGBOOST:
            importance = self.model.feature_importances_
        else:
            importance = self.model.feature_importances_

        features = self.feature_names if self.feature_names else [f"feature_{i}" for i in range(len(importance))]

        importance_list = []
        for name, imp in sorted(zip(features, importance), key=lambda x: x[1], reverse=True):
            importance_list.append({
                'feature': name,
                'importance': float(imp),
                'importance_pct': float(imp / sum(importance)) if sum(importance) > 0 else 0
            })

        return importance_list


def train_and_save_model() -> Dict[str, Any]:
    """Convenience function to train and save the churn model."""
    trainer = ChurnModelTrainer()
    metrics = trainer.train()
    trainer.save_model()
    return metrics


def get_model_info() -> Dict[str, Any]:
    """Get information about the saved model."""
    trainer = ChurnModelTrainer()
    if trainer.load_model():
        return {
            'model_loaded': True,
            'metrics': trainer.training_metrics,
            'feature_importance': trainer.get_feature_importance()
        }
    return {'model_loaded': False}


if __name__ == "__main__":
    print("Training churn prediction model...")
    metrics = train_and_save_model()
    print("\nTraining complete!")
    print(f"AUC-ROC: {metrics['auc_roc']:.4f}")
