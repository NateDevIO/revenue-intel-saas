"""
ML Models Module
================

Provides machine learning capabilities for churn prediction:
- Model training with XGBoost
- Prediction with SHAP explanations
- Probability calibration
- Threshold optimization
"""

from .train import (
    ChurnModelTrainer,
    train_and_save_model,
    get_model_info,
    MODEL_DIR,
)

from .predict import (
    ChurnPredictor,
    get_predictions_for_segment,
    get_high_risk_customers,
)

from .calibration import (
    ModelCalibrator,
    find_optimal_threshold,
    get_calibration_report,
    get_reliability_diagram_data,
    calculate_prediction_intervals,
)

__all__ = [
    # Training
    'ChurnModelTrainer',
    'train_and_save_model',
    'get_model_info',
    'MODEL_DIR',
    # Prediction
    'ChurnPredictor',
    'get_predictions_for_segment',
    'get_high_risk_customers',
    # Calibration
    'ModelCalibrator',
    'find_optimal_threshold',
    'get_calibration_report',
    'get_reliability_diagram_data',
    'calculate_prediction_intervals',
]
