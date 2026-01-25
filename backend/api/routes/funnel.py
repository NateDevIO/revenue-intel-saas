"""
Funnel Analytics Routes
=======================

API endpoints for sales funnel analytics including:
- Conversion rates
- Velocity metrics
- Cohort analysis
- Loss reasons
- Rep performance
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any

from analysis import (
    get_funnel_summary,
    get_stage_conversion_rates,
    get_funnel_by_segment,
    get_velocity_metrics,
    get_cohort_analysis,
    get_loss_reasons,
    get_rep_performance,
    get_cac_by_channel,
)

router = APIRouter()


@router.get("/summary")
async def funnel_summary(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
) -> Dict[str, Any]:
    """
    Get high-level funnel summary metrics.

    Returns total pipeline, conversion rates, and stage breakdown.
    """
    try:
        return get_funnel_summary(start_date, end_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversion")
async def funnel_conversion(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
) -> List[Dict[str, Any]]:
    """
    Get conversion rates between each funnel stage.

    Returns both count-based and dollar-weighted conversion rates.
    """
    try:
        return get_stage_conversion_rates(start_date, end_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-segment")
async def funnel_by_segment(
    segment: str = Query("company_size", description="Segment field (company_size, channel, industry)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
) -> List[Dict[str, Any]]:
    """
    Get funnel metrics segmented by a specific field.

    Useful for identifying which segments convert best.
    """
    try:
        valid_segments = ['company_size', 'channel', 'industry']
        if segment not in valid_segments:
            raise HTTPException(status_code=400, detail=f"Invalid segment. Must be one of: {valid_segments}")

        return get_funnel_by_segment(segment, start_date, end_date)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/velocity")
async def funnel_velocity(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    company_size: Optional[str] = Query(None, description="Filter by company size")
) -> List[Dict[str, Any]]:
    """
    Get time-to-stage velocity metrics.

    Returns median, p75, and flags for slow deals by stage transition.
    """
    try:
        return get_velocity_metrics(start_date, end_date, company_size)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cohorts")
async def funnel_cohorts(
    period: str = Query("month", description="Cohort period (week or month)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
) -> List[Dict[str, Any]]:
    """
    Get cohort analysis data.

    Analyzes lead cohorts by conversion over time.
    """
    try:
        if period not in ['week', 'month']:
            raise HTTPException(status_code=400, detail="Period must be 'week' or 'month'")

        return get_cohort_analysis(period, start_date, end_date)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/loss-reasons")
async def funnel_loss_reasons(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    stage: Optional[str] = Query(None, description="Filter by stage")
) -> List[Dict[str, Any]]:
    """
    Get loss reason breakdown.

    Returns loss reasons aggregated by stage with dollar impact.
    """
    try:
        return get_loss_reasons(start_date, end_date, stage)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rep-performance")
async def funnel_rep_performance(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
) -> List[Dict[str, Any]]:
    """
    Get sales rep performance metrics.

    Returns win rates, revenue, and performance vs team average.
    """
    try:
        return get_rep_performance(start_date, end_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cac-by-channel")
async def cac_by_channel(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
) -> List[Dict[str, Any]]:
    """
    Get Customer Acquisition Cost by channel.

    Returns CAC, customers acquired, and efficiency metrics per channel.
    """
    try:
        return get_cac_by_channel(start_date, end_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
