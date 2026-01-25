"""
Revenue Intelligence Routes
===========================

API endpoints for revenue analytics including:
- LTV/CAC metrics
- Net Revenue Retention
- MRR waterfall
- Revenue at risk
- Revenue leakage analysis
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any

from analysis import (
    get_revenue_summary,
    get_nrr_trend,
    get_ltv_cac_by_segment,
    get_ltv_cac_summary,
    get_mrr_waterfall,
    get_revenue_at_risk,
    get_revenue_leakage_analysis,
    get_action_priority_matrix,
    get_industry_benchmarks,
)

router = APIRouter()


@router.get("/summary")
async def revenue_summary() -> Dict[str, Any]:
    """
    Get comprehensive revenue summary metrics.

    Returns MRR, ARR, NRR, LTV/CAC, and period movements.
    """
    try:
        return get_revenue_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ltv-cac")
async def ltv_cac_metrics() -> Dict[str, Any]:
    """
    Get LTV:CAC metrics overall and by segment.

    Returns lifetime value, acquisition cost, and payback period.
    """
    try:
        return get_ltv_cac_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ltv-cac/by-segment")
async def ltv_cac_by_segment() -> List[Dict[str, Any]]:
    """
    Get LTV:CAC breakdown by customer segment.

    Returns segment-level unit economics.
    """
    try:
        return get_ltv_cac_by_segment()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/nrr")
async def nrr_metrics(
    periods: int = Query(12, ge=1, le=24, description="Number of periods")
) -> Dict[str, Any]:
    """
    Get Net Revenue Retention metrics and trend.

    Returns NRR over time with component breakdown.
    """
    try:
        summary = get_revenue_summary()
        trend = get_nrr_trend(periods)

        return {
            'current_nrr': summary.get('nrr', 0),
            'trend': trend
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/waterfall")
async def mrr_waterfall(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
) -> List[Dict[str, Any]]:
    """
    Get MRR movement waterfall data.

    Returns starting MRR, movements (new, expansion, contraction, churn), and ending MRR.
    """
    try:
        return get_mrr_waterfall(start_date, end_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/at-risk")
async def revenue_at_risk() -> Dict[str, Any]:
    """
    Get revenue at risk breakdown.

    Returns ARR at risk by segment with risk factors.
    """
    try:
        return get_revenue_at_risk()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/leakage")
async def revenue_leakage() -> List[Dict[str, Any]]:
    """
    Get revenue leakage analysis.

    Identifies sources of revenue loss with recommendations.
    """
    try:
        return get_revenue_leakage_analysis()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mrr-movements")
async def mrr_movements(
    start_date: Optional[str] = Query(None, description="Start date"),
    end_date: Optional[str] = Query(None, description="End date"),
    movement_type: Optional[str] = Query(None, description="Filter by type")
) -> Dict[str, Any]:
    """
    Get MRR movements summary.

    Returns movement counts and amounts by type.
    """
    try:
        from data.database import get_mrr_movements_summary
        movements = get_mrr_movements_summary(start_date, end_date)

        return {
            'movements': movements.to_dict('records') if not movements.empty else [],
            'summary': {
                'total_movements': int(movements['movement_count'].sum()) if not movements.empty else 0,
                'net_change': float(movements['total_amount'].sum()) if not movements.empty else 0
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/actions")
async def prioritized_actions() -> List[Dict[str, Any]]:
    """
    Get prioritized action recommendations.

    Returns actions ranked by expected ARR impact with confidence intervals.
    """
    try:
        return get_action_priority_matrix()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/benchmarks")
async def industry_benchmarks() -> Dict[str, Any]:
    """
    Get industry benchmark comparisons.

    Compares company metrics against SaaS industry medians.
    """
    try:
        return get_industry_benchmarks()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
