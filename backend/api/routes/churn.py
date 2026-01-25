"""
Churn Prediction Routes
=======================

API endpoints for churn prediction including:
- Churn predictions
- Churn drivers/feature importance
- Model calibration data
- At-risk customers
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any

from analysis import (
    get_churn_summary,
    get_churn_by_segment,
    get_churn_predictions,
    get_churn_drivers,
    get_at_risk_customers,
    get_churn_cohort_analysis,
    get_intervention_recommendations,
)
from models import (
    ChurnPredictor,
    get_model_info,
    get_calibration_report,
    get_reliability_diagram_data,
    find_optimal_threshold,
)

router = APIRouter()


@router.get("/summary")
async def churn_summary() -> Dict[str, Any]:
    """
    Get churn summary metrics.

    Returns overall churn rate, ARR at risk, and key statistics.
    """
    try:
        return get_churn_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-segment")
async def churn_by_segment(
    segment: str = Query("company_size", description="Segment field")
) -> List[Dict[str, Any]]:
    """
    Get churn metrics by segment.

    Returns churn rate and ARR at risk per segment.
    """
    try:
        valid_segments = ['company_size', 'industry', 'channel']
        if segment not in valid_segments:
            raise HTTPException(status_code=400, detail=f"Invalid segment. Must be one of: {valid_segments}")

        return get_churn_by_segment(segment)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/predictions")
async def churn_predictions(
    min_probability: float = Query(0.0, ge=0, le=1, description="Minimum churn probability"),
    limit: int = Query(100, ge=1, le=500, description="Number of results")
) -> List[Dict[str, Any]]:
    """
    Get churn predictions for active customers.

    Returns customers sorted by churn probability with risk details.
    """
    try:
        return get_churn_predictions(min_probability, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/predictions/{customer_id}")
async def customer_churn_prediction(customer_id: str) -> Dict[str, Any]:
    """
    Get detailed churn prediction for a specific customer.

    Returns probability, risk level, and explanation with SHAP values.
    """
    try:
        predictor = ChurnPredictor()
        result = predictor.predict_single(customer_id)

        if 'error' in result:
            raise HTTPException(status_code=404, detail=result['error'])

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/drivers")
async def churn_drivers(
    customer_id: Optional[str] = Query(None, description="Customer ID for specific drivers")
) -> List[Dict[str, Any]]:
    """
    Get churn drivers (feature importance).

    If customer_id provided, returns specific drivers for that customer.
    Otherwise returns overall feature importance.
    """
    try:
        return get_churn_drivers(customer_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/at-risk")
async def at_risk_customers(
    threshold: float = Query(0.5, ge=0, le=1, description="Churn probability threshold"),
    min_mrr: float = Query(0, ge=0, description="Minimum MRR filter")
) -> List[Dict[str, Any]]:
    """
    Get customers above churn risk threshold.

    Returns at-risk customers with recommended actions.
    """
    try:
        return get_at_risk_customers(threshold, min_mrr)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cohorts")
async def churn_cohorts() -> List[Dict[str, Any]]:
    """
    Get churn analysis by customer cohort.

    Returns churn rate and metrics by signup cohort.
    """
    try:
        return get_churn_cohort_analysis()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/interventions")
async def intervention_recommendations(
    budget: float = Query(50000, ge=0, description="Intervention budget")
) -> Dict[str, Any]:
    """
    Get prioritized intervention recommendations.

    Returns customers to contact for maximum ARR saved within budget.
    """
    try:
        return get_intervention_recommendations(budget)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model/info")
async def model_info() -> Dict[str, Any]:
    """
    Get information about the churn prediction model.

    Returns training metrics and feature importance.
    """
    try:
        return get_model_info()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calibration")
async def calibration_data() -> Dict[str, Any]:
    """
    Get model calibration report.

    Returns calibration metrics and reliability diagram data.
    """
    try:
        return get_calibration_report()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calibration/reliability-diagram")
async def reliability_diagram() -> Dict[str, Any]:
    """
    Get data for reliability diagram visualization.

    Returns binned predictions vs actual outcomes for calibration assessment.
    """
    try:
        return get_reliability_diagram_data()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/threshold/optimize")
async def optimize_threshold(
    cost_fn: float = Query(500, description="Cost of missing a churner"),
    cost_fp: float = Query(100, description="Cost of false positive"),
    effectiveness: float = Query(0.3, ge=0, le=1, description="Intervention effectiveness")
) -> Dict[str, Any]:
    """
    Find optimal classification threshold.

    Optimizes threshold to maximize business value given costs.
    """
    try:
        return find_optimal_threshold(cost_fn, cost_fp, effectiveness)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
