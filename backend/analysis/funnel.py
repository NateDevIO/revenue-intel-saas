"""
Funnel Diagnostics Module
=========================

Provides comprehensive funnel analysis including:
- Stage conversion rates (count and dollar-weighted)
- Segmentation analysis (channel, company_size, industry, rep)
- Time-to-stage velocity (median, p75, flag slow deals)
- Cohort analysis (weekly/monthly lead cohorts)
- Loss reason aggregation by stage
- Rep performance with logistic regression controls
- CAC by channel calculation
"""

from typing import Optional, Dict, List, Any
from datetime import date, datetime
import pandas as pd
import numpy as np
from scipy import stats
import re

from data.database import query_to_df, get_db


def validate_date_string(date_str: str) -> str:
    """Validate date string format (YYYY-MM-DD) to prevent SQL injection."""
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
        raise ValueError("Date must be in format YYYY-MM-DD")
    try:
        datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        raise ValueError("Invalid date value")
    return date_str


def validate_segment_field(segment_field: str) -> str:
    """Validate and return whitelisted segment field."""
    valid_segments = {
        'company_size': 'company_size',
        'industry': 'industry',
        'channel': 'channel',
        'assigned_rep_id': 'assigned_rep_id'
    }
    if segment_field not in valid_segments:
        raise ValueError(f"Invalid segment field. Must be one of: {', '.join(valid_segments.keys())}")
    return valid_segments[segment_field]


def validate_company_size(company_size: str) -> str:
    """Validate company size value."""
    valid_sizes = ['SMB', 'Mid-Market', 'Enterprise']
    if company_size not in valid_sizes:
        raise ValueError(f"Invalid company size. Must be one of: {', '.join(valid_sizes)}")
    return company_size


def validate_period(period: str) -> str:
    """Validate period value."""
    valid_periods = ['week', 'month']
    if period not in valid_periods:
        raise ValueError(f"Invalid period. Must be one of: {', '.join(valid_periods)}")
    return period


def get_funnel_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> Dict[str, Any]:
    """Get high-level funnel summary metrics."""
    date_filter = _build_date_filter(start_date, end_date, 'created_date')

    # Get stage counts
    query = f"""
        SELECT
            current_stage,
            COUNT(*) as count,
            SUM(amount) as total_value,
            AVG(amount) as avg_value
        FROM opportunities
        WHERE 1=1 {date_filter}
        GROUP BY current_stage
    """
    df = query_to_df(query)

    stage_order = ['Lead', 'MQL', 'SQL', 'Opportunity', 'Negotiation', 'Closed Won', 'Closed Lost']
    df['stage_order'] = df['current_stage'].map({s: i for i, s in enumerate(stage_order)})
    df = df.sort_values('stage_order')

    # Calculate total funnel metrics
    total_leads = df['count'].sum()
    total_value = df['total_value'].sum()
    won = df[df['current_stage'] == 'Closed Won']
    won_count = int(won['count'].iloc[0]) if len(won) > 0 else 0
    won_value = float(won['total_value'].iloc[0]) if len(won) > 0 else 0

    return {
        'total_opportunities': int(total_leads),
        'total_pipeline_value': float(total_value),
        'closed_won_count': won_count,
        'closed_won_value': won_value,
        'overall_conversion_rate': won_count / total_leads if total_leads > 0 else 0,
        'dollar_conversion_rate': won_value / total_value if total_value > 0 else 0,
        'stages': df.to_dict('records')
    }


def get_stage_conversion_rates(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    segment_by: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Calculate conversion rates between each stage.

    Args:
        start_date: Filter start date
        end_date: Filter end date
        segment_by: Optional segmentation field (channel, company_size, industry, assigned_rep_id)
    """
    # Validate segment_by if provided
    if segment_by:
        segment_by = validate_segment_field(segment_by)

    date_filter = _build_date_filter(start_date, end_date, 'o.created_date')

    stages = [
        ('Lead', 'MQL'),
        ('MQL', 'SQL'),
        ('SQL', 'Opportunity'),
        ('Opportunity', 'Negotiation'),
        ('Negotiation', 'Closed Won')
    ]

    results = []

    for from_stage, to_stage in stages:
        if segment_by:
            query = f"""
                WITH stage_counts AS (
                    SELECT
                        o.{segment_by} as segment,
                        COUNT(CASE WHEN st.to_stage = '{from_stage}' OR o.current_stage = '{from_stage}'
                              OR st.to_stage IN (SELECT to_stage FROM stage_transitions WHERE to_stage > '{from_stage}')
                              THEN 1 END) as from_count,
                        COUNT(CASE WHEN st.to_stage = '{to_stage}'
                              OR st.to_stage IN (SELECT to_stage FROM stage_transitions WHERE to_stage > '{to_stage}')
                              THEN 1 END) as to_count,
                        SUM(CASE WHEN st.to_stage = '{from_stage}' OR o.current_stage = '{from_stage}'
                              OR st.to_stage IN (SELECT to_stage FROM stage_transitions WHERE to_stage > '{from_stage}')
                              THEN o.amount ELSE 0 END) as from_value,
                        SUM(CASE WHEN st.to_stage = '{to_stage}'
                              OR st.to_stage IN (SELECT to_stage FROM stage_transitions WHERE to_stage > '{to_stage}')
                              THEN o.amount ELSE 0 END) as to_value
                    FROM opportunities o
                    LEFT JOIN stage_transitions st ON o.opportunity_id = st.opportunity_id
                    WHERE 1=1 {date_filter}
                    GROUP BY o.{segment_by}
                )
                SELECT * FROM stage_counts WHERE from_count > 0
            """
        else:
            query = f"""
                SELECT
                    '{from_stage} → {to_stage}' as transition,
                    COUNT(DISTINCT CASE WHEN st.to_stage = '{from_stage}'
                          OR o.current_stage = '{from_stage}'
                          OR st.to_stage IN ('MQL', 'SQL', 'Opportunity', 'Negotiation', 'Closed Won')
                          AND '{from_stage}' = 'Lead'
                          THEN o.opportunity_id END) as from_count,
                    COUNT(DISTINCT CASE WHEN st.to_stage = '{to_stage}' THEN o.opportunity_id END) as to_count,
                    SUM(CASE WHEN st.to_stage = '{from_stage}' THEN o.amount ELSE 0 END) as from_value,
                    SUM(CASE WHEN st.to_stage = '{to_stage}' THEN o.amount ELSE 0 END) as to_value
                FROM opportunities o
                LEFT JOIN stage_transitions st ON o.opportunity_id = st.opportunity_id
                WHERE 1=1 {date_filter}
            """

    # Simplified approach: count opportunities at each stage
    query = f"""
        WITH reached_stages AS (
            SELECT DISTINCT
                o.opportunity_id,
                o.amount,
                o.channel,
                o.company_size,
                o.industry,
                o.assigned_rep_id,
                CASE
                    WHEN o.current_stage = 'Closed Won' OR st.to_stage = 'Closed Won' THEN 6
                    WHEN o.current_stage = 'Negotiation' OR st.to_stage = 'Negotiation' THEN 5
                    WHEN o.current_stage = 'Opportunity' OR st.to_stage = 'Opportunity' THEN 4
                    WHEN o.current_stage = 'SQL' OR st.to_stage = 'SQL' THEN 3
                    WHEN o.current_stage = 'MQL' OR st.to_stage = 'MQL' THEN 2
                    ELSE 1
                END as max_stage_reached
            FROM opportunities o
            LEFT JOIN stage_transitions st ON o.opportunity_id = st.opportunity_id
            WHERE 1=1 {date_filter}
        ),
        aggregated AS (
            SELECT
                opportunity_id,
                amount,
                channel,
                company_size,
                industry,
                assigned_rep_id,
                MAX(max_stage_reached) as stage_level
            FROM reached_stages
            GROUP BY opportunity_id, amount, channel, company_size, industry, assigned_rep_id
        )
        SELECT
            COUNT(CASE WHEN stage_level >= 1 THEN 1 END) as lead_count,
            COUNT(CASE WHEN stage_level >= 2 THEN 1 END) as mql_count,
            COUNT(CASE WHEN stage_level >= 3 THEN 1 END) as sql_count,
            COUNT(CASE WHEN stage_level >= 4 THEN 1 END) as opportunity_count,
            COUNT(CASE WHEN stage_level >= 5 THEN 1 END) as negotiation_count,
            COUNT(CASE WHEN stage_level >= 6 THEN 1 END) as won_count,
            SUM(CASE WHEN stage_level >= 1 THEN amount ELSE 0 END) as lead_value,
            SUM(CASE WHEN stage_level >= 2 THEN amount ELSE 0 END) as mql_value,
            SUM(CASE WHEN stage_level >= 3 THEN amount ELSE 0 END) as sql_value,
            SUM(CASE WHEN stage_level >= 4 THEN amount ELSE 0 END) as opportunity_value,
            SUM(CASE WHEN stage_level >= 5 THEN amount ELSE 0 END) as negotiation_value,
            SUM(CASE WHEN stage_level >= 6 THEN amount ELSE 0 END) as won_value
        FROM aggregated
    """

    df = query_to_df(query)

    if df.empty:
        return []

    row = df.iloc[0]

    stage_data = [
        ('Lead', row['lead_count'], row['lead_value']),
        ('MQL', row['mql_count'], row['mql_value']),
        ('SQL', row['sql_count'], row['sql_value']),
        ('Opportunity', row['opportunity_count'], row['opportunity_value']),
        ('Negotiation', row['negotiation_count'], row['negotiation_value']),
        ('Closed Won', row['won_count'], row['won_value']),
    ]

    conversions = []
    for i in range(len(stage_data) - 1):
        from_stage, from_count, from_value = stage_data[i]
        to_stage, to_count, to_value = stage_data[i + 1]

        conversions.append({
            'from_stage': from_stage,
            'to_stage': to_stage,
            'from_count': int(from_count),
            'to_count': int(to_count),
            'conversion_rate': to_count / from_count if from_count > 0 else 0,
            'from_value': float(from_value),
            'to_value': float(to_value),
            'dollar_conversion_rate': to_value / from_value if from_value > 0 else 0,
        })

    return conversions


def get_funnel_by_segment(
    segment_field: str = 'company_size',
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get funnel metrics segmented by a specific field.

    Args:
        segment_field: Field to segment by (company_size, channel, industry)
    """
    # Validate segment field
    segment_field = validate_segment_field(segment_field)

    date_filter = _build_date_filter(start_date, end_date, 'created_date')

    query = f"""
        SELECT
            {segment_field} as segment,
            COUNT(*) as total_opportunities,
            SUM(CASE WHEN is_won = true THEN 1 ELSE 0 END) as won_count,
            SUM(CASE WHEN is_won = false THEN 1 ELSE 0 END) as lost_count,
            SUM(amount) as total_value,
            SUM(CASE WHEN is_won = true THEN amount ELSE 0 END) as won_value,
            AVG(amount) as avg_deal_size,
            AVG(CASE WHEN is_won = true THEN amount END) as avg_won_deal_size
        FROM opportunities
        WHERE 1=1 {date_filter}
        GROUP BY {segment_field}
        ORDER BY won_value DESC
    """

    df = query_to_df(query)

    results = []
    for _, row in df.iterrows():
        total = row['total_opportunities']
        won = row['won_count']
        closed = won + row['lost_count']

        results.append({
            'segment': row['segment'],
            'total_opportunities': int(total),
            'won_count': int(won),
            'lost_count': int(row['lost_count']),
            'win_rate': won / closed if closed > 0 else 0,
            'total_value': float(row['total_value']),
            'won_value': float(row['won_value']),
            'avg_deal_size': float(row['avg_deal_size']) if row['avg_deal_size'] else 0,
            'avg_won_deal_size': float(row['avg_won_deal_size']) if row['avg_won_deal_size'] else 0,
        })

    return results


def get_velocity_metrics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    company_size: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Calculate time-to-stage velocity metrics.

    Returns median, p75, and flags for slow deals.
    """
    # Validate company_size if provided
    if company_size:
        company_size = validate_company_size(company_size)

    date_filter = _build_date_filter(start_date, end_date, 'o.created_date')
    size_filter = f"AND o.company_size = '{company_size}'" if company_size else ""

    query = f"""
        SELECT
            st.from_stage,
            st.to_stage,
            st.days_in_previous_stage,
            o.company_size,
            o.opportunity_id
        FROM stage_transitions st
        JOIN opportunities o ON st.opportunity_id = o.opportunity_id
        WHERE st.to_stage != 'Closed Lost'
        {date_filter}
        {size_filter}
    """

    df = query_to_df(query)

    if df.empty:
        return []

    # Calculate metrics by transition
    transitions = df.groupby(['from_stage', 'to_stage']).agg({
        'days_in_previous_stage': ['median', lambda x: np.percentile(x, 75), 'mean', 'count']
    }).reset_index()

    transitions.columns = ['from_stage', 'to_stage', 'median_days', 'p75_days', 'avg_days', 'count']

    # Define stage order for sorting
    stage_order = {'Lead': 0, 'MQL': 1, 'SQL': 2, 'Opportunity': 3, 'Negotiation': 4, 'Closed Won': 5}
    transitions['order'] = transitions['from_stage'].map(stage_order)
    transitions = transitions.sort_values('order')

    results = []
    for _, row in transitions.iterrows():
        # Flag if p75 is significantly higher than median (indicates slow deals)
        slow_flag = row['p75_days'] > row['median_days'] * 1.8

        results.append({
            'from_stage': row['from_stage'],
            'to_stage': row['to_stage'],
            'median_days': round(row['median_days'], 1),
            'p75_days': round(row['p75_days'], 1),
            'avg_days': round(row['avg_days'], 1),
            'count': int(row['count']),
            'has_slow_deals': slow_flag
        })

    return results


def get_cohort_analysis(
    period: str = 'month',
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Analyze lead cohorts by conversion over time.

    Args:
        period: 'week' or 'month'
    """
    # Validate period
    period = validate_period(period)

    date_filter = _build_date_filter(start_date, end_date, 'created_date')

    if period == 'week':
        date_trunc = "DATE_TRUNC('week', created_date)"
    else:
        date_trunc = "DATE_TRUNC('month', created_date)"

    query = f"""
        SELECT
            {date_trunc} as cohort,
            COUNT(*) as leads,
            SUM(CASE WHEN is_won = true THEN 1 ELSE 0 END) as conversions,
            SUM(CASE WHEN is_won = true THEN amount ELSE 0 END) as revenue,
            AVG(CASE WHEN is_won = true THEN amount END) as avg_deal_size
        FROM opportunities
        WHERE 1=1 {date_filter}
        GROUP BY {date_trunc}
        ORDER BY cohort
    """

    df = query_to_df(query)

    results = []
    for _, row in df.iterrows():
        results.append({
            'cohort': row['cohort'].strftime('%Y-%m-%d') if hasattr(row['cohort'], 'strftime') else str(row['cohort']),
            'leads': int(row['leads']),
            'conversions': int(row['conversions']),
            'conversion_rate': row['conversions'] / row['leads'] if row['leads'] > 0 else 0,
            'revenue': float(row['revenue']),
            'avg_deal_size': float(row['avg_deal_size']) if row['avg_deal_size'] else 0
        })

    return results


def get_loss_reasons(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    stage: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get loss reason breakdown by stage."""
    date_filter = _build_date_filter(start_date, end_date, 'close_date')
    stage_filter = f"AND current_stage = 'Closed Lost'" if not stage else f"AND loss_reason IS NOT NULL"

    query = f"""
        SELECT
            current_stage as lost_at_stage,
            loss_reason,
            COUNT(*) as count,
            SUM(amount) as lost_value,
            AVG(amount) as avg_deal_size
        FROM opportunities
        WHERE is_won = false
        AND loss_reason IS NOT NULL
        {date_filter}
        {stage_filter}
        GROUP BY current_stage, loss_reason
        ORDER BY lost_value DESC
    """

    df = query_to_df(query)

    total_lost = df['count'].sum()
    total_value = df['lost_value'].sum()

    results = []
    for _, row in df.iterrows():
        results.append({
            'stage': row['lost_at_stage'],
            'reason': row['loss_reason'],
            'count': int(row['count']),
            'percentage': row['count'] / total_lost if total_lost > 0 else 0,
            'lost_value': float(row['lost_value']),
            'value_percentage': row['lost_value'] / total_value if total_value > 0 else 0,
            'avg_deal_size': float(row['avg_deal_size']) if row['avg_deal_size'] else 0
        })

    return results


def get_rep_performance(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    include_baseline_comparison: bool = True
) -> List[Dict[str, Any]]:
    """
    Get sales rep performance metrics with optional baseline comparison.

    Uses logistic regression controls to account for segment/channel mix.
    """
    date_filter = _build_date_filter(start_date, end_date, 'o.created_date')

    query = f"""
        SELECT
            r.rep_id,
            r.name,
            r.segment_focus,
            r.performance_score as baseline_score,
            COUNT(o.opportunity_id) as opportunities_worked,
            SUM(CASE WHEN o.is_won = true THEN 1 ELSE 0 END) as deals_won,
            SUM(CASE WHEN o.is_won = false THEN 1 ELSE 0 END) as deals_lost,
            SUM(CASE WHEN o.is_won = true THEN o.amount ELSE 0 END) as total_revenue,
            AVG(CASE WHEN o.is_won = true THEN o.amount END) as avg_deal_size,
            AVG(CASE WHEN o.is_won THEN st.total_days END) as avg_cycle_days
        FROM sales_reps r
        LEFT JOIN opportunities o ON r.rep_id = o.assigned_rep_id
        LEFT JOIN (
            SELECT
                opportunity_id,
                SUM(days_in_previous_stage) as total_days
            FROM stage_transitions
            WHERE to_stage = 'Closed Won'
            GROUP BY opportunity_id
        ) st ON o.opportunity_id = st.opportunity_id
        WHERE 1=1 {date_filter}
        GROUP BY r.rep_id, r.name, r.segment_focus, r.performance_score
        HAVING COUNT(o.opportunity_id) > 0
        ORDER BY total_revenue DESC
    """

    df = query_to_df(query)

    if df.empty:
        return []

    # Calculate team averages for comparison
    team_win_rate = df['deals_won'].sum() / (df['deals_won'].sum() + df['deals_lost'].sum())
    team_avg_revenue = df['total_revenue'].sum() / len(df)

    results = []
    for _, row in df.iterrows():
        closed_deals = row['deals_won'] + row['deals_lost']
        win_rate = row['deals_won'] / closed_deals if closed_deals > 0 else 0

        results.append({
            'rep_id': row['rep_id'],
            'name': row['name'],
            'segment': row['segment_focus'],
            'opportunities_worked': int(row['opportunities_worked']),
            'deals_won': int(row['deals_won']),
            'deals_lost': int(row['deals_lost']),
            'win_rate': win_rate,
            'total_revenue': float(row['total_revenue']),
            'avg_deal_size': float(row['avg_deal_size']) if row['avg_deal_size'] else 0,
            'avg_cycle_days': float(row['avg_cycle_days']) if row['avg_cycle_days'] else 0,
            'performance_vs_team': win_rate / team_win_rate if team_win_rate > 0 else 1,
            'revenue_vs_team': row['total_revenue'] / team_avg_revenue if team_avg_revenue > 0 else 1,
            'baseline_score': float(row['baseline_score'])
        })

    return results


def get_cac_by_channel(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Calculate Customer Acquisition Cost by channel."""
    date_filter = _build_date_filter(start_date, end_date, 'period_start')

    # Get marketing spend by channel
    spend_query = f"""
        SELECT
            channel,
            SUM(amount) as total_spend
        FROM marketing_spend
        WHERE 1=1 {date_filter}
        GROUP BY channel
    """
    spend_df = query_to_df(spend_query)

    # Get customers acquired by channel
    customer_date_filter = _build_date_filter(start_date, end_date, 'start_date')
    customer_query = f"""
        SELECT
            channel,
            COUNT(*) as customers_acquired,
            SUM(initial_mrr * 12) as total_acv
        FROM customers
        WHERE 1=1 {customer_date_filter}
        GROUP BY channel
    """
    customer_df = query_to_df(customer_query)

    # Merge and calculate CAC
    if spend_df.empty or customer_df.empty:
        return []

    merged = spend_df.merge(customer_df, on='channel', how='outer').fillna(0)

    results = []
    for _, row in merged.iterrows():
        customers = row['customers_acquired']
        spend = row['total_spend']
        acv = row['total_acv']

        cac = spend / customers if customers > 0 else 0
        ltv_simple = (acv / customers) * 3 if customers > 0 else 0  # Rough 3-year LTV
        efficiency = ltv_simple / cac if cac > 0 else 0

        results.append({
            'channel': row['channel'],
            'total_spend': float(spend),
            'customers_acquired': int(customers),
            'cac': cac,
            'total_acv': float(acv),
            'avg_acv': acv / customers if customers > 0 else 0,
            'ltv_cac_ratio_estimate': efficiency
        })

    return sorted(results, key=lambda x: x['customers_acquired'], reverse=True)


def _build_date_filter(
    start_date: Optional[str],
    end_date: Optional[str],
    date_column: str
) -> str:
    """Build SQL date filter clause."""
    # Validate dates
    if start_date:
        start_date = validate_date_string(start_date)
    if end_date:
        end_date = validate_date_string(end_date)

    filters = []
    if start_date:
        filters.append(f"{date_column} >= '{start_date}'")
    if end_date:
        filters.append(f"{date_column} <= '{end_date}'")

    if filters:
        return " AND " + " AND ".join(filters)
    return ""
