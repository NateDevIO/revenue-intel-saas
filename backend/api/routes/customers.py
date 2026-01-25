"""
Customer Analytics Routes
=========================

API endpoints for customer analytics including:
- Customer list with health scores
- Customer detail
- Segment analysis
- Health distribution
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
import pandas as pd
import re

from data.database import query_to_df
from analysis import (
    calculate_health_score,
    get_health_distribution,
    get_health_by_segment,
    get_health_trend,
    get_customers_by_health,
)
from analysis.churn import get_churn_drivers

router = APIRouter()


def validate_customer_id(customer_id: str) -> bool:
    """Validate customer ID format to prevent SQL injection."""
    # Customer IDs should match pattern: CUST_XXXXXXXX (8 alphanumeric chars)
    pattern = r'^CUST_[A-Z0-9]{8}$'
    return bool(re.match(pattern, customer_id))


@router.get("")
async def list_customers(
    status: str = Query("Active", description="Customer status (Active, Churned, all)"),
    health: Optional[str] = Query(None, description="Filter by health score (Green, Yellow, Red)"),
    company_size: Optional[str] = Query(None, description="Filter by company size"),
    sort_by: str = Query("churn_probability", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc, desc)"),
    limit: int = Query(50, description="Number of results", ge=1, le=500),
    offset: int = Query(0, description="Offset for pagination", ge=0)
) -> Dict[str, Any]:
    """
    Get list of customers with health scores and key metrics.

    Returns paginated list with filtering and sorting options.
    """
    try:
        # Validate inputs against whitelists
        valid_statuses = ['Active', 'Churned', 'all']
        valid_health = ['Green', 'Yellow', 'Red']
        valid_company_sizes = ['SMB', 'Mid-Market', 'Enterprise']

        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

        if health and health not in valid_health:
            raise HTTPException(status_code=400, detail=f"Invalid health score. Must be one of: {', '.join(valid_health)}")

        if company_size and company_size not in valid_company_sizes:
            raise HTTPException(status_code=400, detail=f"Invalid company size. Must be one of: {', '.join(valid_company_sizes)}")

        # Build query with validated inputs
        where_clauses = []

        if status != "all":
            where_clauses.append(f"status = '{status}'")

        if health:
            where_clauses.append(f"health_score = '{health}'")

        if company_size:
            where_clauses.append(f"company_size = '{company_size}'")

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        # Map frontend field names to database field names first
        if sort_by == 'nps_score':
            sort_by = 'latest_nps_score'

        # Validate sort field
        valid_sort = ['company_name', 'current_mrr', 'churn_probability', 'start_date', 'health_score', 'company_size', 'latest_nps_score', 'tenure_days']
        if sort_by not in valid_sort:
            sort_by = 'churn_probability'

        sort_dir = "DESC" if sort_order.lower() == "desc" else "ASC"

        # Count total
        count_query = f"SELECT COUNT(*) as total FROM customers WHERE {where_sql}"
        count_df = query_to_df(count_query)
        total = int(count_df.iloc[0]['total'])

        # Get customers
        query = f"""
            SELECT
                customer_id,
                company_name,
                company_size,
                industry,
                channel,
                status,
                start_date,
                churn_date,
                current_mrr,
                initial_mrr,
                health_score,
                churn_probability,
                latest_nps_score,
                DATEDIFF('day', start_date, CURRENT_DATE) as tenure_days
            FROM customers
            WHERE {where_sql}
            ORDER BY {sort_by} {sort_dir} NULLS LAST
            LIMIT {limit} OFFSET {offset}
        """

        df = query_to_df(query)

        customers = []
        for _, row in df.iterrows():
            customers.append({
                'customer_id': row['customer_id'],
                'company_name': row['company_name'],
                'company_size': row['company_size'],
                'industry': row['industry'],
                'channel': row['channel'],
                'status': row['status'],
                'start_date': str(row['start_date']),
                'churn_date': str(row['churn_date']) if pd.notna(row['churn_date']) else None,
                'current_mrr': float(row['current_mrr']) if pd.notna(row['current_mrr']) else 0,
                'arr': float(row['current_mrr']) * 12 if pd.notna(row['current_mrr']) else 0,
                'initial_mrr': float(row['initial_mrr']) if pd.notna(row['initial_mrr']) else 0,
                'health_score': row['health_score'] if pd.notna(row['health_score']) else None,
                'churn_probability': float(row['churn_probability']) if pd.notna(row['churn_probability']) else None,
                'nps_score': int(row['latest_nps_score']) if pd.notna(row['latest_nps_score']) else None,
                'tenure_days': int(row['tenure_days']) if pd.notna(row['tenure_days']) else 0,
            })

        return {
            'customers': customers,
            'total': total,
            'limit': limit,
            'offset': offset,
            'has_more': offset + limit < total
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/segments")
async def customer_segments() -> Dict[str, Any]:
    """
    Get customer health distribution by segment.

    Returns health breakdown for each company size segment.
    """
    try:
        by_size = get_health_by_segment('company_size')
        by_industry = get_health_by_segment('industry')

        return {
            'by_company_size': by_size,
            'by_industry': by_industry
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health-distribution")
async def health_distribution() -> Dict[str, Any]:
    """
    Get overall health score distribution.

    Returns count and MRR breakdown by health category.
    """
    try:
        return get_health_distribution()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health-trend")
async def health_trend(
    days: int = Query(90, description="Number of days of history", ge=7, le=365)
) -> List[Dict[str, Any]]:
    """
    Get health score trend over time.

    Returns weekly snapshots of health distribution.
    """
    try:
        return get_health_trend(days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-health/{health_category}")
async def customers_by_health(
    health_category: str,
    limit: int = Query(50, ge=1, le=200),
    order_by: str = Query("mrr", description="Order by mrr or churn_probability")
) -> List[Dict[str, Any]]:
    """
    Get customers filtered by health category.

    Returns customers in specified health category (Green, Yellow, Red).
    """
    try:
        if health_category not in ['Green', 'Yellow', 'Red']:
            raise HTTPException(status_code=400, detail="Health category must be Green, Yellow, or Red")

        return get_customers_by_health(health_category, limit, order_by)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{customer_id}")
async def customer_detail(customer_id: str) -> Dict[str, Any]:
    """
    Get detailed information for a single customer.

    Returns full customer profile with health breakdown and churn drivers.
    """
    try:
        # Validate customer ID format
        if not validate_customer_id(customer_id):
            raise HTTPException(status_code=400, detail="Invalid customer ID format")

        # Get basic customer data
        query = f"""
            SELECT
                c.*,
                DATEDIFF('day', c.start_date, CURRENT_DATE) as tenure_days
            FROM customers c
            WHERE c.customer_id = '{customer_id}'
        """
        df = query_to_df(query)

        if df.empty:
            raise HTTPException(status_code=404, detail="Customer not found")

        row = df.iloc[0]

        # Get health score breakdown
        health = calculate_health_score(customer_id)

        # Get churn drivers
        drivers = get_churn_drivers(customer_id)

        # Get recent usage summary
        usage_query = f"""
            SELECT
                AVG(logins) as avg_logins,
                AVG(api_calls) as avg_api_calls,
                MAX(event_date) as last_active
            FROM usage_events
            WHERE customer_id = '{customer_id}'
            AND event_date >= CURRENT_DATE - INTERVAL 30 DAY
        """
        usage_df = query_to_df(usage_query)

        usage_summary = {}
        if not usage_df.empty:
            usage = usage_df.iloc[0]
            usage_summary = {
                'avg_logins_30d': float(usage['avg_logins']) if usage['avg_logins'] else 0,
                'avg_api_calls_30d': float(usage['avg_api_calls']) if usage['avg_api_calls'] else 0,
                'last_active': str(usage['last_active']) if usage['last_active'] else None
            }

        # Get MRR history
        mrr_query = f"""
            SELECT
                movement_date,
                movement_type,
                amount,
                new_mrr
            FROM mrr_movements
            WHERE customer_id = '{customer_id}'
            ORDER BY movement_date
        """
        mrr_df = query_to_df(mrr_query)
        mrr_history = mrr_df.to_dict('records') if not mrr_df.empty else []

        return {
            'customer_id': row['customer_id'],
            'company_name': row['company_name'],
            'company_size': row['company_size'],
            'industry': row['industry'],
            'channel': row['channel'],
            'status': row['status'],
            'start_date': str(row['start_date']),
            'churn_date': str(row['churn_date']) if pd.notna(row['churn_date']) else None,
            'tenure_days': int(row['tenure_days']) if pd.notna(row['tenure_days']) else 0,
            'current_mrr': float(row['current_mrr']) if pd.notna(row['current_mrr']) else 0,
            'initial_mrr': float(row['initial_mrr']) if pd.notna(row['initial_mrr']) else 0,
            'arr': float(row['current_mrr']) * 12 if pd.notna(row['current_mrr']) else 0,
            'health_score': row['health_score'] if pd.notna(row['health_score']) else None,
            'churn_probability': float(row['churn_probability']) if pd.notna(row['churn_probability']) else None,
            'nps_score': int(row['latest_nps_score']) if pd.notna(row['latest_nps_score']) else None,
            'health_breakdown': health.get('components', {}),
            'churn_drivers': drivers,
            'usage_summary': usage_summary,
            'mrr_history': mrr_history,
            'recommendations': health.get('recommendations', [])
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{customer_id}/usage")
async def customer_usage(
    customer_id: str,
    days: int = Query(30, ge=1, le=365)
) -> List[Dict[str, Any]]:
    """
    Get usage history for a customer.

    Returns daily usage metrics for the specified period.
    """
    try:
        # Validate customer ID format
        if not validate_customer_id(customer_id):
            raise HTTPException(status_code=400, detail="Invalid customer ID format")

        query = f"""
            SELECT
                event_date,
                logins,
                api_calls,
                reports_generated,
                team_members_active,
                integrations_used
            FROM usage_events
            WHERE customer_id = '{customer_id}'
            AND event_date >= CURRENT_DATE - INTERVAL {days} DAY
            ORDER BY event_date
        """
        df = query_to_df(query)

        if df.empty:
            raise HTTPException(status_code=404, detail="No usage data found")

        return df.to_dict('records')
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
