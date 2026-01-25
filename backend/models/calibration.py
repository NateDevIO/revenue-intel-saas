"""
Model Calibration Module
========================

Provides probability calibration for churn predictions:
- Platt scaling calibration
- Isotonic regression calibration
- Reliability diagram generation
- Optimal threshold selection
- Expected calibration error calculation
"""

import pickle
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import pandas as pd
import numpy as np
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.metrics import brier_score_loss, log_loss

from data.database import query_to_df
from .train import ChurnModelTrainer, MODEL_DIR


class ModelCalibrator:
    """Calibrates model probabilities for better reliability."""

    def __init__(self):
        self.trainer = ChurnModelTrainer()
        self.calibrated_model = None
        self.calibration_metrics = {}

    def calibrate_model(self, method: str = 'sigmoid') -> Dict[str, Any]:
        """
        Calibrate the model using Platt scaling or isotonic regression.

        Args:
            method: 'sigmoid' (Platt scaling) or 'isotonic'
        """
        if not self.trainer.load_model():
            return {'error': 'No model found to calibrate'}

        # Prepare data
        df = self.trainer.prepare_features()
        df = self.trainer.encode_categorical(df, fit=False)

        feature_cols = self.trainer.get_feature_columns()
        available = [f for f in feature_cols if f in df.columns]

        X = df[available].fillna(0)
        y = df['churned']

        # Scale features
        X_scaled = self.trainer.scaler.transform(X)

        # Calibrate using cross-validation
        self.calibrated_model = CalibratedClassifierCV(
            self.trainer.model,
            method=method,
            cv=5
        )

        self.calibrated_model.fit(X_scaled, y)

        # Evaluate calibration
        self.calibration_metrics = self._evaluate_calibration(X_scaled, y)

        # Save calibrated model
        self._save_calibrated_model()

        return self.calibration_metrics

    def _evaluate_calibration(
        self,
        X: np.ndarray,
        y: pd.Series
    ) -> Dict[str, Any]:
        """Evaluate calibration quality."""
        # Get predictions from both models
        raw_proba = self.trainer.model.predict_proba(X)[:, 1]
        calibrated_proba = self.calibrated_model.predict_proba(X)[:, 1]

        # Calculate metrics
        metrics = {
            'raw': {
                'brier_score': float(brier_score_loss(y, raw_proba)),
                'log_loss': float(log_loss(y, raw_proba)),
                'ece': self._expected_calibration_error(y, raw_proba)
            },
            'calibrated': {
                'brier_score': float(brier_score_loss(y, calibrated_proba)),
                'log_loss': float(log_loss(y, calibrated_proba)),
                'ece': self._expected_calibration_error(y, calibrated_proba)
            }
        }

        # Generate reliability diagram data
        metrics['reliability_diagram'] = self._get_reliability_diagram_data(y, calibrated_proba)

        return metrics

    def _expected_calibration_error(
        self,
        y_true: pd.Series,
        y_prob: np.ndarray,
        n_bins: int = 10
    ) -> float:
        """Calculate Expected Calibration Error (ECE)."""
        bin_boundaries = np.linspace(0, 1, n_bins + 1)
        ece = 0

        for i in range(n_bins):
            in_bin = (y_prob >= bin_boundaries[i]) & (y_prob < bin_boundaries[i + 1])
            prop_in_bin = in_bin.mean()

            if prop_in_bin > 0:
                avg_confidence = y_prob[in_bin].mean()
                avg_accuracy = y_true[in_bin].mean()
                ece += np.abs(avg_accuracy - avg_confidence) * prop_in_bin

        return float(ece)

    def _get_reliability_diagram_data(
        self,
        y_true: pd.Series,
        y_prob: np.ndarray,
        n_bins: int = 10
    ) -> Dict[str, Any]:
        """Generate data for reliability diagram."""
        fraction_of_positives, mean_predicted_value = calibration_curve(
            y_true, y_prob, n_bins=n_bins, strategy='uniform'
        )

        return {
            'bins': list(range(1, len(fraction_of_positives) + 1)),
            'fraction_positive': fraction_of_positives.tolist(),
            'mean_predicted': mean_predicted_value.tolist(),
            'perfect_calibration': mean_predicted_value.tolist()  # For reference line
        }

    def _save_calibrated_model(self):
        """Save calibrated model to disk."""
        if self.calibrated_model is None:
            return

        path = MODEL_DIR / "churn_model_calibrated.pkl"
        with open(path, 'wb') as f:
            pickle.dump(self.calibrated_model, f)

        metrics_path = MODEL_DIR / "calibration_metrics.pkl"
        with open(metrics_path, 'wb') as f:
            pickle.dump(self.calibration_metrics, f)

    def load_calibrated_model(self) -> bool:
        """Load calibrated model from disk."""
        path = MODEL_DIR / "churn_model_calibrated.pkl"
        if not path.exists():
            return False

        with open(path, 'rb') as f:
            self.calibrated_model = pickle.load(f)

        metrics_path = MODEL_DIR / "calibration_metrics.pkl"
        if metrics_path.exists():
            with open(metrics_path, 'rb') as f:
                self.calibration_metrics = pickle.load(f)

        return True


def find_optimal_threshold(
    cost_fn: float = 500,
    cost_fp: float = 100,
    intervention_effectiveness: float = 0.3
) -> Dict[str, Any]:
    """
    Find optimal classification threshold to maximize business value.

    Args:
        cost_fn: Cost of missing a churner (lost ARR)
        cost_fp: Cost of unnecessary intervention
        intervention_effectiveness: Probability of saving a customer with intervention
    """
    trainer = ChurnModelTrainer()
    if not trainer.load_model():
        return {'error': 'No model found'}

    # Prepare data
    df = trainer.prepare_features()
    df = trainer.encode_categorical(df, fit=False)

    feature_cols = trainer.get_feature_columns()
    available = [f for f in feature_cols if f in df.columns]

    X = df[available].fillna(0)
    y = df['churned']
    mrr = df['current_mrr'].fillna(df['initial_mrr'])

    X_scaled = trainer.scaler.transform(X)
    y_prob = trainer.model.predict_proba(X_scaled)[:, 1]

    # Test different thresholds
    thresholds = np.arange(0.1, 0.9, 0.05)
    results = []

    for threshold in thresholds:
        y_pred = (y_prob >= threshold).astype(int)

        # Calculate confusion matrix components
        tp = ((y_pred == 1) & (y == 1)).sum()
        fp = ((y_pred == 1) & (y == 0)).sum()
        fn = ((y_pred == 0) & (y == 1)).sum()
        tn = ((y_pred == 0) & (y == 0)).sum()

        # Calculate business value
        # Value from saving churners
        saved_value = tp * mrr[y == 1].mean() * 12 * intervention_effectiveness if tp > 0 else 0

        # Cost of interventions (both successful and unsuccessful)
        intervention_cost = (tp + fp) * cost_fp

        # Cost of missed churners
        missed_cost = fn * cost_fn

        net_value = saved_value - intervention_cost - missed_cost

        results.append({
            'threshold': float(threshold),
            'precision': tp / (tp + fp) if (tp + fp) > 0 else 0,
            'recall': tp / (tp + fn) if (tp + fn) > 0 else 0,
            'tp': int(tp),
            'fp': int(fp),
            'fn': int(fn),
            'tn': int(tn),
            'saved_value': float(saved_value),
            'intervention_cost': float(intervention_cost),
            'missed_cost': float(missed_cost),
            'net_value': float(net_value)
        })

    # Find optimal threshold
    optimal = max(results, key=lambda x: x['net_value'])

    return {
        'optimal_threshold': optimal['threshold'],
        'optimal_metrics': optimal,
        'all_thresholds': results,
        'parameters': {
            'cost_fn': cost_fn,
            'cost_fp': cost_fp,
            'intervention_effectiveness': intervention_effectiveness
        }
    }


def get_calibration_report() -> Dict[str, Any]:
    """Get calibration report for the model."""
    calibrator = ModelCalibrator()

    if calibrator.load_calibrated_model():
        return {
            'calibrated': True,
            'metrics': calibrator.calibration_metrics
        }

    # Try to calibrate
    result = calibrator.calibrate_model()
    if 'error' in result:
        return result

    return {
        'calibrated': True,
        'metrics': result
    }


def get_reliability_diagram_data() -> Dict[str, Any]:
    """Get data for reliability diagram visualization."""
    calibrator = ModelCalibrator()

    if not calibrator.load_calibrated_model():
        # Try to load raw metrics
        calibrator.trainer.load_model()
        if calibrator.trainer.model is None:
            return {'error': 'No model found'}

        # Generate reliability data from raw model
        df = calibrator.trainer.prepare_features()
        df = calibrator.trainer.encode_categorical(df, fit=False)

        feature_cols = calibrator.trainer.get_feature_columns()
        available = [f for f in feature_cols if f in df.columns]

        X = df[available].fillna(0)
        y = df['churned']

        X_scaled = calibrator.trainer.scaler.transform(X)
        y_prob = calibrator.trainer.model.predict_proba(X_scaled)[:, 1]

        fraction_of_positives, mean_predicted_value = calibration_curve(
            y, y_prob, n_bins=10, strategy='uniform'
        )

        return {
            'model_type': 'raw',
            'bins': list(range(1, len(fraction_of_positives) + 1)),
            'fraction_positive': fraction_of_positives.tolist(),
            'mean_predicted': mean_predicted_value.tolist()
        }

    return {
        'model_type': 'calibrated',
        **calibrator.calibration_metrics.get('reliability_diagram', {})
    }


def calculate_prediction_intervals(
    customer_ids: List[str],
    confidence: float = 0.80
) -> List[Dict[str, Any]]:
    """
    Calculate prediction intervals for churn probabilities.

    Uses bootstrap resampling to estimate uncertainty.
    """
    trainer = ChurnModelTrainer()
    if not trainer.load_model():
        return []

    results = []
    n_bootstrap = 100

    for customer_id in customer_ids:
        # Get features
        query = f"""
            SELECT * FROM customers
            WHERE customer_id = '{customer_id}'
        """
        df = query_to_df(query)

        if df.empty:
            continue

        # Get prediction
        df = trainer.prepare_features()
        customer_df = df[df['customer_id'] == customer_id]

        if customer_df.empty:
            continue

        customer_df = trainer.encode_categorical(customer_df, fit=False)

        feature_cols = trainer.get_feature_columns()
        available = [f for f in feature_cols if f in customer_df.columns]

        X = customer_df[available].fillna(0)
        X_scaled = trainer.scaler.transform(X)

        # Bootstrap predictions
        predictions = []
        for _ in range(n_bootstrap):
            # Add small noise to features
            X_noisy = X_scaled + np.random.normal(0, 0.1, X_scaled.shape)
            pred = trainer.model.predict_proba(X_noisy)[0, 1]
            predictions.append(pred)

        predictions = np.array(predictions)
        lower_pct = (1 - confidence) / 2 * 100
        upper_pct = (1 + confidence) / 2 * 100

        results.append({
            'customer_id': customer_id,
            'point_estimate': float(trainer.model.predict_proba(X_scaled)[0, 1]),
            'lower_bound': float(np.percentile(predictions, lower_pct)),
            'upper_bound': float(np.percentile(predictions, upper_pct)),
            'confidence_level': confidence
        })

    return results
