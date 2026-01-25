"""
Revenue Intelligence Module
===========================

Provides comprehensive revenue analysis including:
- LTV calculation (cohort-based with survival analysis)
- LTV:CAC ratio by segment
- Payback period
- Net Revenue Retention (NRR)
- MRR movement waterfall
- Revenue at risk calculation
- Action prioritization matrix
- Monte Carlo simulation for confidence intervals
"""

from typing import Optional, Dict, List, Any, Tuple
from datetime import date, datetime, timedelta
import pandas as pd
import numpy as np
from scipy import stats
import re

from data.database import query_to_df, get_db


def validate_date_string(date_str: str) -> str:
    """Validate date string format (YYYY-MM-DD) to prevent SQL injection."""
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
        raise ValueError("Date must be in format YYYY-MM-DD")
    # Also validate it's a real date
    try:
        datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        raise ValueError("Invalid date value")
    return date_str


def validate_positive_integer(value: int, max_value: int = 365, param_name: str = "parameter") -> int:
    """Validate that a value is a positive integer within range."""
    if not isinstance(value, int) or value < 1:
        raise ValueError(f"{param_name} must be a positive integer")
    if value > max_value:
        raise ValueError(f"{param_name} must be less than or equal to {max_value}")
    return value


def get_revenue_summary() -> Dict[str, Any]:
    """Get comprehensive revenue summary metrics."""
    # Current MRR/ARR
    mrr_query = """
        SELECT
            SUM(CASE WHEN status = 'Active' THEN current_mrr ELSE 0 END) as current_mrr,
            COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_customers,
            AVG(CASE WHEN status = 'Active' THEN current_mrr END) as avg_mrr
        FROM customers
    """
    mrr_df = query_to_df(mrr_query)

    # MRR movements last 12 months (using max date in data as reference)
    movement_query = """
        WITH max_date AS (
            SELECT MAX(movement_date) as latest FROM mrr_movements
        )
        SELECT
            movement_type,
            SUM(amount) as total_amount,
            COUNT(*) as movement_count
        FROM mrr_movements, max_date
        WHERE movement_date >= max_date.latest - INTERVAL 12 MONTH
        GROUP BY movement_type
    """
    movement_df = query_to_df(movement_query)

    # Calculate NRR
    nrr = _calculate_nrr()

    # Get LTV:CAC
    ltv_cac = get_ltv_cac_summary()

    if mrr_df.empty:
        return {}

    row = mrr_df.iloc[0]
    current_mrr = float(row['current_mrr']) if row['current_mrr'] else 0

    # Parse movements
    movements = {}
    if not movement_df.empty:
        for _, m in movement_df.iterrows():
            movements[m['movement_type']] = float(m['total_amount'])

    return {
        'current_mrr': current_mrr,
        'current_arr': current_mrr * 12,
        'active_customers': int(row['active_customers']) if row['active_customers'] else 0,
        'avg_mrr_per_customer': float(row['avg_mrr']) if row['avg_mrr'] else 0,
        'nrr': nrr,
        'new_mrr_12m': movements.get('New', 0),
        'expansion_mrr_12m': movements.get('Expansion', 0),
        'contraction_mrr_12m': abs(movements.get('Contraction', 0)),
        'churn_mrr_12m': abs(movements.get('Churn', 0)),
        'ltv_cac_ratio': ltv_cac.get('overall_ltv_cac', 0),
        'avg_payback_months': ltv_cac.get('avg_payback_months', 0)
    }


def _calculate_nrr(months: int = 12) -> float:
    """Calculate Net Revenue Retention over specified period."""
    # Validate months parameter
    months = validate_positive_integer(months, max_value=120, param_name="months")

    query = f"""
        WITH max_movement_date AS (
            SELECT MAX(movement_date) as latest FROM mrr_movements
        ),
        -- Get customers who existed 12 months ago
        cohort AS (
            SELECT
                c.customer_id,
                c.initial_mrr,
                c.start_date
            FROM customers c, max_movement_date
            WHERE c.start_date <= max_movement_date.latest - INTERVAL {months} MONTH
        ),
        -- Get their MRR from 12 months ago (or initial if no movements yet)
        starting_mrr_per_customer AS (
            SELECT
                co.customer_id,
                COALESCE(
                    (SELECT new_mrr FROM mrr_movements m
                     WHERE m.customer_id = co.customer_id
                     AND m.movement_date <= (SELECT latest - INTERVAL {months} MONTH FROM max_movement_date)
                     ORDER BY m.movement_date DESC
                     LIMIT 1),
                    co.initial_mrr
                ) as starting_mrr
            FROM cohort co
        ),
        -- Get their current MRR (0 if churned)
        current_state AS (
            SELECT
                c.customer_id,
                CASE
                    WHEN c.status = 'Active' THEN c.current_mrr
                    ELSE 0
                END as current_mrr
            FROM customers c
            JOIN cohort co ON c.customer_id = co.customer_id
        )
        SELECT
            SUM(st.starting_mrr) as starting_mrr,
            SUM(cs.current_mrr) as ending_mrr
        FROM starting_mrr_per_customer st
        JOIN current_state cs ON st.customer_id = cs.customer_id
    """

    df = query_to_df(query)

    if df.empty or df.iloc[0]['starting_mrr'] is None:
        return 1.0

    starting = df.iloc[0]['starting_mrr']
    ending = df.iloc[0]['ending_mrr']

    return ending / starting if starting > 0 else 1.0


def get_nrr_trend(periods: int = 12) -> List[Dict[str, Any]]:
    """Get NRR trend over time."""
    # Validate periods parameter
    periods = validate_positive_integer(periods, max_value=60, param_name="periods")

    results = []

    for i in range(periods, 0, -1):
        query = f"""
            WITH cohort AS (
                SELECT
                    customer_id,
                    initial_mrr as starting_mrr
                FROM customers
                WHERE start_date <= CURRENT_DATE - INTERVAL {i + 12} MONTH
                AND start_date > CURRENT_DATE - INTERVAL {i + 24} MONTH
            ),
            state_at_time AS (
                SELECT
                    c.customer_id,
                    CASE
                        WHEN c.status = 'Active' OR (c.status = 'Churned' AND c.churn_date > CURRENT_DATE - INTERVAL {i} MONTH)
                        THEN COALESCE(
                            (SELECT new_mrr FROM mrr_movements
                             WHERE customer_id = c.customer_id
                             AND movement_date <= CURRENT_DATE - INTERVAL {i} MONTH
                             ORDER BY movement_date DESC LIMIT 1),
                            c.initial_mrr
                        )
                        ELSE 0
                    END as mrr_at_time
                FROM customers c
                JOIN cohort co ON c.customer_id = co.customer_id
            )
            SELECT
                SUM(co.starting_mrr) as starting_mrr,
                SUM(st.mrr_at_time) as ending_mrr
            FROM cohort co
            JOIN state_at_time st ON co.customer_id = st.customer_id
        """

        df = query_to_df(query)

        if not df.empty and df.iloc[0]['starting_mrr']:
            starting = float(df.iloc[0]['starting_mrr'])
            ending = float(df.iloc[0]['ending_mrr']) if df.iloc[0]['ending_mrr'] else 0
            nrr = ending / starting if starting > 0 else 1.0
        else:
            nrr = 1.0

        period_date = date.today() - timedelta(days=i * 30)
        results.append({
            'period': period_date.strftime('%Y-%m'),
            'nrr': nrr
        })

    return results


def get_ltv_cac_by_segment() -> List[Dict[str, Any]]:
    """Calculate LTV:CAC ratio by segment."""
    segments = ['SMB', 'Mid-Market', 'Enterprise']
    results = []

    for segment in segments:
        # Calculate CAC
        cac_query = f"""
            SELECT
                SUM(ms.amount) / NULLIF(COUNT(DISTINCT c.customer_id), 0) as cac
            FROM marketing_spend ms
            CROSS JOIN customers c
            WHERE c.company_size = '{segment}'
            AND c.start_date BETWEEN ms.period_start AND ms.period_end
        """
        cac_df = query_to_df(cac_query)

        # Simplified CAC calculation
        spend_query = f"""
            SELECT SUM(amount) as total_spend
            FROM marketing_spend
        """
        spend_df = query_to_df(spend_query)

        customer_query = f"""
            SELECT COUNT(*) as customer_count
            FROM customers
            WHERE company_size = '{segment}'
        """
        customer_df = query_to_df(customer_query)

        # Calculate LTV using cohort retention
        ltv_query = f"""
            SELECT
                AVG(initial_mrr) as avg_mrr,
                AVG(CASE
                    WHEN status = 'Churned'
                    THEN DATEDIFF('month', start_date, churn_date)
                    ELSE DATEDIFF('month', start_date, CURRENT_DATE)
                END) as avg_lifetime_months
            FROM customers
            WHERE company_size = '{segment}'
        """
        ltv_df = query_to_df(ltv_query)

        if ltv_df.empty:
            continue

        ltv_row = ltv_df.iloc[0]
        avg_mrr = float(ltv_row['avg_mrr']) if ltv_row['avg_mrr'] else 0
        avg_lifetime = float(ltv_row['avg_lifetime_months']) if ltv_row['avg_lifetime_months'] else 12

        # Calculate LTV with gross margin (typical SaaS gross margin is 70-80%)
        gross_margin = 0.75  # 75% gross margin assumption for SaaS
        # Use actual average lifetime without arbitrary multiplier
        # Cap at 60 months for conservative long-term estimate
        projected_lifetime = min(avg_lifetime, 60)
        ltv = avg_mrr * gross_margin * projected_lifetime

        # Calculate segment-specific CAC (proportional allocation based on actual customer mix)
        total_spend = float(spend_df.iloc[0]['total_spend']) if not spend_df.empty else 0
        segment_customers = int(customer_df.iloc[0]['customer_count']) if not customer_df.empty else 0
        total_customers_df = query_to_df("SELECT COUNT(*) as cnt FROM customers")
        total_customers = int(total_customers_df.iloc[0]['cnt']) if not total_customers_df.empty else 1

        # Allocate spend proportionally to customer acquisition
        segment_spend_share = (segment_customers / total_customers) if total_customers > 0 else 0
        cac = (total_spend * segment_spend_share) / segment_customers if segment_customers > 0 else 0

        ltv_cac_ratio = ltv / cac if cac > 0 else 0
        payback_months = cac / avg_mrr if avg_mrr > 0 else 0

        results.append({
            'segment': segment,
            'ltv': ltv,
            'cac': cac,
            'ltv_cac_ratio': ltv_cac_ratio,
            'payback_months': payback_months,
            'avg_mrr': avg_mrr,
            'avg_lifetime_months': avg_lifetime,
            'customer_count': segment_customers
        })

    return results


def get_ltv_cac_summary() -> Dict[str, Any]:
    """Get overall LTV:CAC summary."""
    segments = get_ltv_cac_by_segment()

    if not segments:
        return {'overall_ltv_cac': 0, 'avg_payback_months': 0}

    total_ltv = sum(s['ltv'] * s['customer_count'] for s in segments)
    total_cac = sum(s['cac'] * s['customer_count'] for s in segments)
    total_customers = sum(s['customer_count'] for s in segments)

    overall_ltv = total_ltv / total_customers if total_customers > 0 else 0
    overall_cac = total_cac / total_customers if total_customers > 0 else 0

    return {
        'overall_ltv': overall_ltv,
        'overall_cac': overall_cac,
        'overall_ltv_cac': overall_ltv / overall_cac if overall_cac > 0 else 0,
        'avg_payback_months': sum(s['payback_months'] * s['customer_count'] for s in segments) / total_customers if total_customers > 0 else 0,
        'by_segment': segments
    }


def get_mrr_waterfall(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Generate MRR movement waterfall chart data."""
    # Validate date inputs
    if start_date:
        start_date = validate_date_string(start_date)
    if end_date:
        end_date = validate_date_string(end_date)

    # If no dates provided, use last 12 months of data
    if not start_date or not end_date:
        date_range_query = """
            WITH max_date AS (
                SELECT MAX(movement_date) as latest FROM mrr_movements
            )
            SELECT
                latest - INTERVAL 12 MONTH as start_date,
                latest as end_date
            FROM max_date
        """
        date_range_df = query_to_df(date_range_query)
        if not date_range_df.empty:
            start_date = str(date_range_df.iloc[0]['start_date'])
            end_date = str(date_range_df.iloc[0]['end_date'])

    date_filter = ""
    if start_date:
        date_filter += f" AND movement_date >= '{start_date}'"
    if end_date:
        date_filter += f" AND movement_date <= '{end_date}'"

    # Get starting MRR (MRR at the beginning of the period, before any movements)
    # This is the sum of MRR for all customers who existed at start_date
    starting_mrr_query = f"""
        SELECT COALESCE(SUM(
            CASE
                WHEN c.start_date < '{start_date}' THEN
                    COALESCE(
                        (SELECT new_mrr FROM mrr_movements m
                         WHERE m.customer_id = c.customer_id
                         AND m.movement_date < '{start_date}'
                         ORDER BY m.movement_date DESC
                         LIMIT 1),
                        c.initial_mrr
                    )
                ELSE 0
            END
        ), 0) as starting_mrr
        FROM customers c
        WHERE c.start_date < '{start_date}'
        AND (c.churn_date IS NULL OR c.churn_date >= '{start_date}')
    """
    starting_df = query_to_df(starting_mrr_query)

    if starting_df.empty:
        starting_mrr = 0.0
    else:
        val = starting_df.iloc[0]['starting_mrr']
        starting_mrr = float(val) if (val is not None and not (isinstance(val, float) and pd.isna(val))) else 0.0

    # Get movements for the period
    movement_query = f"""
        SELECT
            movement_type,
            SUM(amount) as total_amount
        FROM mrr_movements
        WHERE 1=1 {date_filter}
        GROUP BY movement_type
    """
    movement_df = query_to_df(movement_query)

    # Parse movements
    movements = {}
    for _, row in movement_df.iterrows():
        amt = row['total_amount']
        movements[row['movement_type']] = float(amt) if (amt is not None and not (isinstance(amt, float) and pd.isna(amt))) else 0.0

    # Extract individual movements
    new_business = float(movements.get('New', 0.0))
    expansion = float(movements.get('Expansion', 0.0))
    contraction = float(movements.get('Contraction', 0.0))
    churn = float(movements.get('Churn', 0.0))
    reactivation = float(movements.get('Reactivation', 0.0))

    # Calculate ending MRR using forward calculation
    net_movement = new_business + expansion + contraction + churn + reactivation
    ending_mrr = float(starting_mrr + net_movement)

    # Build waterfall
    waterfall = []
    running_total = float(starting_mrr)

    waterfall.append({
        'category': 'Starting MRR',
        'amount': float(starting_mrr),
        'is_total': True,
        'running_total': float(running_total)
    })

    # Add movements in order
    movement_order = [
        ('New', 'New Business', True),
        ('Expansion', 'Expansion', True),
        ('Contraction', 'Contraction', False),
        ('Churn', 'Churn', False),
        ('Reactivation', 'Reactivation', True),
    ]

    for key, label, is_positive in movement_order:
        amount = float(movements.get(key, 0.0))
        if amount != 0:
            running_total += amount
            waterfall.append({
                'category': label,
                'amount': float(amount),
                'is_positive': is_positive,
                'is_total': False,
                'running_total': float(running_total)
            })

    waterfall.append({
        'category': 'Ending MRR',
        'amount': float(ending_mrr),
        'is_total': True,
        'running_total': float(ending_mrr)
    })

    return waterfall


def get_revenue_at_risk() -> Dict[str, Any]:
    """Calculate total revenue at risk from churn."""
    query = """
        SELECT
            company_size,
            SUM(current_mrr * 12) as arr,
            SUM(current_mrr * 12 * COALESCE(churn_probability, 0)) as arr_at_risk,
            COUNT(*) as customer_count,
            AVG(churn_probability) as avg_churn_prob
        FROM customers
        WHERE status = 'Active'
        GROUP BY company_size
    """

    df = query_to_df(query)

    segments = []
    total_arr = 0
    total_at_risk = 0

    for _, row in df.iterrows():
        arr = float(row['arr']) if row['arr'] else 0
        at_risk = float(row['arr_at_risk']) if row['arr_at_risk'] else 0
        total_arr += arr
        total_at_risk += at_risk

        segments.append({
            'segment': row['company_size'],
            'arr': arr,
            'arr_at_risk': at_risk,
            'customer_count': int(row['customer_count']),
            'avg_churn_probability': float(row['avg_churn_prob']) if row['avg_churn_prob'] else 0,
            'percentage_of_total_risk': 0  # Will calculate after
        })

    # Calculate percentages
    for seg in segments:
        seg['percentage_of_total_risk'] = seg['arr_at_risk'] / total_at_risk if total_at_risk > 0 else 0

    return {
        'total_arr': total_arr,
        'total_arr_at_risk': total_at_risk,
        'risk_percentage': total_at_risk / total_arr if total_arr > 0 else 0,
        'by_segment': sorted(segments, key=lambda x: x['arr_at_risk'], reverse=True)
    }


def get_revenue_leakage_analysis() -> List[Dict[str, Any]]:
    """Identify sources of revenue leakage."""
    leakage_sources = []

    # 1. Funnel conversion leakage
    funnel_query = """
        WITH max_date AS (
            SELECT MAX(close_date) as latest FROM opportunities
        )
        SELECT
            COUNT(CASE WHEN is_won = false THEN 1 END) as lost_deals,
            SUM(CASE WHEN is_won = false THEN amount ELSE 0 END) as lost_value
        FROM opportunities, max_date
        WHERE close_date >= max_date.latest - INTERVAL 12 MONTH
    """
    funnel_df = query_to_df(funnel_query)

    if not funnel_df.empty:
        lost_value = float(funnel_df.iloc[0]['lost_value']) if funnel_df.iloc[0]['lost_value'] else 0
        leakage_sources.append({
            'source': 'Lost Deals',
            'amount': lost_value,
            'description': f"Pipeline value lost to competitors or no-decision",
            'actionable': True,
            'recommendation': 'Analyze loss reasons and improve win rate'
        })

    # 2. Churn leakage
    churn_query = """
        WITH max_date AS (
            SELECT MAX(movement_date) as latest FROM mrr_movements
        )
        SELECT
            SUM(ABS(amount)) as churned_mrr
        FROM mrr_movements, max_date
        WHERE movement_type = 'Churn'
        AND movement_date >= max_date.latest - INTERVAL 12 MONTH
    """
    churn_df = query_to_df(churn_query)

    if not churn_df.empty:
        churned_mrr = float(churn_df.iloc[0]['churned_mrr']) if churn_df.iloc[0]['churned_mrr'] else 0
        leakage_sources.append({
            'source': 'Customer Churn',
            'amount': churned_mrr * 12,  # Annualize
            'description': 'Annual recurring revenue lost to churn',
            'actionable': True,
            'recommendation': 'Implement proactive retention program'
        })

    # 3. Contraction leakage
    contraction_query = """
        WITH max_date AS (
            SELECT MAX(movement_date) as latest FROM mrr_movements
        )
        SELECT
            SUM(ABS(amount)) as contracted_mrr
        FROM mrr_movements, max_date
        WHERE movement_type = 'Contraction'
        AND movement_date >= max_date.latest - INTERVAL 12 MONTH
    """
    contraction_df = query_to_df(contraction_query)

    if not contraction_df.empty:
        contracted = float(contraction_df.iloc[0]['contracted_mrr']) if contraction_df.iloc[0]['contracted_mrr'] else 0
        leakage_sources.append({
            'source': 'Downgrades',
            'amount': contracted * 12,
            'description': 'Revenue lost to plan downgrades',
            'actionable': True,
            'recommendation': 'Review downgrade reasons and improve value delivery'
        })

    # 4. Missed expansion
    expansion_query = """
        WITH max_date AS (
            SELECT MAX(closed_date) as latest FROM expansion_opportunities WHERE closed_date IS NOT NULL
        )
        SELECT
            SUM(CASE WHEN status = 'Lost' THEN estimated_value ELSE 0 END) as missed_expansion
        FROM expansion_opportunities, max_date
        WHERE closed_date >= max_date.latest - INTERVAL 12 MONTH
    """
    expansion_df = query_to_df(expansion_query)

    if not expansion_df.empty:
        missed = float(expansion_df.iloc[0]['missed_expansion']) if expansion_df.iloc[0]['missed_expansion'] else 0
        leakage_sources.append({
            'source': 'Missed Expansion',
            'amount': missed,
            'description': 'Upsell/cross-sell opportunities not converted',
            'actionable': True,
            'recommendation': 'Improve expansion playbook and timing'
        })

    return sorted(leakage_sources, key=lambda x: x['amount'], reverse=True)


def get_action_priority_matrix() -> List[Dict[str, Any]]:
    """Generate prioritized action recommendations with expected impact."""
    actions = []

    # Get data for calculations
    risk_data = get_revenue_at_risk()
    leakage = get_revenue_leakage_analysis()

    # Action 1: High-risk customer intervention
    high_risk_query = """
        SELECT
            COUNT(*) as count,
            SUM(current_mrr * 12 * churn_probability) as arr_at_risk
        FROM customers
        WHERE status = 'Active'
        AND churn_probability >= 0.5
        AND current_mrr >= 1000
    """
    high_risk_df = query_to_df(high_risk_query)

    if not high_risk_df.empty and high_risk_df.iloc[0]['count'] > 0:
        arr_at_risk = float(high_risk_df.iloc[0]['arr_at_risk'])
        save_rate = 0.30  # Assume 30% can be saved
        expected_impact = arr_at_risk * save_rate

        actions.append({
            'priority': 1,
            'action': 'Proactive outreach to high-risk accounts',
            'category': 'Retention',
            'expected_arr_impact': expected_impact,
            'confidence_low': expected_impact * 0.6,
            'confidence_high': expected_impact * 1.4,
            'effort': 'Medium',
            'affected_customers': int(high_risk_df.iloc[0]['count']),
            'rationale': f"${arr_at_risk:,.0f} ARR at risk from {int(high_risk_df.iloc[0]['count'])} high-churn-probability accounts"
        })

    # Action 2: Improve stage conversion
    conversion_query = """
        WITH max_date AS (
            SELECT MAX(close_date) as latest FROM opportunities
        )
        SELECT
            COUNT(*) as lost_at_negotiation,
            SUM(amount) as lost_value
        FROM opportunities, max_date
        WHERE current_stage = 'Closed Lost'
        AND loss_reason IN ('Price', 'Competitor')
        AND close_date >= max_date.latest - INTERVAL 6 MONTH
    """
    conv_df = query_to_df(conversion_query)

    if not conv_df.empty and conv_df.iloc[0]['lost_at_negotiation'] > 0:
        lost_value = float(conv_df.iloc[0]['lost_value'])
        improvement_rate = 0.10  # 10% improvement in late-stage conversion
        expected_impact = lost_value * improvement_rate

        actions.append({
            'priority': 2,
            'action': 'Competitive win/loss analysis and pricing review',
            'category': 'Sales',
            'expected_arr_impact': expected_impact,
            'confidence_low': expected_impact * 0.5,
            'confidence_high': expected_impact * 1.5,
            'effort': 'High',
            'affected_customers': int(conv_df.iloc[0]['lost_at_negotiation']),
            'rationale': f"${lost_value:,.0f} lost to price/competitor in negotiation stage"
        })

    # Action 3: Expansion acceleration
    expansion_query = """
        SELECT
            COUNT(*) as expansion_count,
            SUM(estimated_value) as potential_value
        FROM expansion_opportunities
        WHERE status IN ('Identified', 'In Progress')
    """
    exp_df = query_to_df(expansion_query)

    if not exp_df.empty and exp_df.iloc[0]['expansion_count'] > 0:
        potential = float(exp_df.iloc[0]['potential_value']) if exp_df.iloc[0]['potential_value'] else 0
        conversion_boost = 0.15  # Boost conversion by 15%
        expected_impact = potential * conversion_boost

        actions.append({
            'priority': 3,
            'action': 'Accelerate expansion pipeline',
            'category': 'Growth',
            'expected_arr_impact': expected_impact,
            'confidence_low': expected_impact * 0.7,
            'confidence_high': expected_impact * 1.3,
            'effort': 'Medium',
            'affected_customers': int(exp_df.iloc[0]['expansion_count']),
            'rationale': f"${potential:,.0f} in identified expansion opportunities"
        })

    # Sort by expected impact
    actions = sorted(actions, key=lambda x: x['expected_arr_impact'], reverse=True)

    # Reassign priorities
    for i, action in enumerate(actions):
        action['priority'] = i + 1

    return actions


def run_monte_carlo_simulation(
    scenario: Dict[str, Any],
    iterations: int = 1000
) -> Dict[str, Any]:
    """
    Run Monte Carlo simulation for scenario analysis.

    Args:
        scenario: Dict with keys like 'churn_reduction', 'conversion_improvement', etc.
        iterations: Number of simulation iterations
    """
    # Get current metrics
    summary = get_revenue_summary()
    current_arr = summary['current_arr']

    results = []

    for _ in range(iterations):
        projected_arr = current_arr

        # Apply scenario parameters with uncertainty
        if 'churn_reduction' in scenario and scenario['churn_reduction']:
            # Churn reduction impact
            target_reduction = scenario['churn_reduction']
            # Add uncertainty (±30%)
            actual_reduction = target_reduction * np.random.triangular(0.7, 1.0, 1.3)
            churn_arr = summary.get('churn_mrr_12m', 0) * 12
            projected_arr += churn_arr * actual_reduction

        if 'conversion_improvement' in scenario and scenario['conversion_improvement']:
            # Conversion improvement impact
            target_improvement = scenario['conversion_improvement']
            actual_improvement = target_improvement * np.random.triangular(0.6, 1.0, 1.4)
            # Estimate impact on pipeline
            pipeline_value = summary.get('new_mrr_12m', 0) * 12
            projected_arr += pipeline_value * actual_improvement

        if 'expansion_increase' in scenario and scenario['expansion_increase']:
            # Expansion rate increase
            target_increase = scenario['expansion_increase']
            actual_increase = target_increase * np.random.triangular(0.7, 1.0, 1.3)
            expansion_arr = summary.get('expansion_mrr_12m', 0) * 12
            projected_arr += expansion_arr * actual_increase

        results.append(projected_arr)

    results = np.array(results)

    return {
        'scenario_name': scenario.get('name', 'Custom Scenario'),
        'current_arr': current_arr,
        'projected_arr_mean': float(np.mean(results)),
        'projected_arr_median': float(np.median(results)),
        'arr_impact_mean': float(np.mean(results) - current_arr),
        'confidence_interval_10': float(np.percentile(results, 10)),
        'confidence_interval_90': float(np.percentile(results, 90)),
        'confidence_interval_25': float(np.percentile(results, 25)),
        'confidence_interval_75': float(np.percentile(results, 75)),
        'distribution': results.tolist()[:100],  # Sample for visualization
        'iterations': iterations,
        'parameters': scenario
    }


def get_industry_benchmarks() -> Dict[str, Any]:
    """Get SaaS industry benchmark comparisons."""
    # Get our metrics
    summary = get_revenue_summary()
    ltv_cac = get_ltv_cac_summary()

    # Industry benchmarks (typical B2B SaaS)
    benchmarks = {
        'nrr': {
            'our_value': summary.get('nrr', 0),
            'benchmark_median': 1.05,
            'benchmark_top_quartile': 1.20,
            'benchmark_bottom_quartile': 0.90,
            'rating': _rate_vs_benchmark(summary.get('nrr', 0), 0.90, 1.05, 1.20)
        },
        'ltv_cac_ratio': {
            'our_value': ltv_cac.get('overall_ltv_cac', 0),
            'benchmark_median': 3.0,
            'benchmark_top_quartile': 5.0,
            'benchmark_bottom_quartile': 2.0,
            'rating': _rate_vs_benchmark(ltv_cac.get('overall_ltv_cac', 0), 2.0, 3.0, 5.0)
        },
        'payback_months': {
            'our_value': ltv_cac.get('avg_payback_months', 0),
            'benchmark_median': 12,
            'benchmark_top_quartile': 8,
            'benchmark_bottom_quartile': 18,
            'rating': _rate_vs_benchmark(ltv_cac.get('avg_payback_months', 0), 18, 12, 8, lower_is_better=True)
        },
        'monthly_churn_rate': {
            'our_value': 1 - (summary.get('nrr', 1) ** (1/12)),  # Derive from NRR
            'benchmark_median': 0.02,
            'benchmark_top_quartile': 0.01,
            'benchmark_bottom_quartile': 0.04,
            'rating': _rate_vs_benchmark(1 - (summary.get('nrr', 1) ** (1/12)), 0.04, 0.02, 0.01, lower_is_better=True)
        }
    }

    return benchmarks


def _rate_vs_benchmark(
    value: float,
    bottom: float,
    median: float,
    top: float,
    lower_is_better: bool = False
) -> str:
    """Rate a value against benchmarks."""
    if lower_is_better:
        if value <= top:
            return 'Excellent'
        elif value <= median:
            return 'Good'
        elif value <= bottom:
            return 'Fair'
        else:
            return 'Needs Improvement'
    else:
        if value >= top:
            return 'Excellent'
        elif value >= median:
            return 'Good'
        elif value >= bottom:
            return 'Fair'
        else:
            return 'Needs Improvement'
