"""
Churn Analysis Module
=====================

Provides churn prediction and analysis including:
- Feature engineering for churn prediction
- Churn risk scoring
- Churn drivers analysis
- Segment-based churn analysis
- Intervention recommendations
"""

from typing import Optional, Dict, List, Any, Tuple
from datetime import date, datetime, timedelta
import pandas as pd
import numpy as np
import re

from data.database import query_to_df, get_db


def validate_customer_id(customer_id: str) -> bool:
    """Validate customer ID format to prevent SQL injection."""
    pattern = r'^CUST_[A-Z0-9]{8}$'
    return bool(re.match(pattern, customer_id))


def validate_segment_field(segment_field: str) -> str:
    """Validate and return whitelisted segment field."""
    valid_segments = {
        'company_size': 'company_size',
        'industry': 'industry',
        'channel': 'channel'
    }
    if segment_field not in valid_segments:
        raise ValueError(f"Invalid segment field. Must be one of: {', '.join(valid_segments.keys())}")
    return valid_segments[segment_field]


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


def get_churn_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> Dict[str, Any]:
    """Get high-level churn summary metrics."""
    # Validate date inputs
    if start_date:
        start_date = validate_date_string(start_date)
    if end_date:
        end_date = validate_date_string(end_date)

    date_filter = ""
    if start_date:
        date_filter += f" AND start_date >= '{start_date}'"
    if end_date:
        date_filter += f" AND (churn_date <= '{end_date}' OR churn_date IS NULL)"

    query = f"""
        SELECT
            COUNT(*) as total_customers,
            SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_customers,
            SUM(CASE WHEN status = 'Churned' THEN 1 ELSE 0 END) as churned_customers,
            SUM(CASE WHEN status = 'Active' THEN current_mrr ELSE 0 END) as active_mrr,
            SUM(CASE WHEN status = 'Churned' THEN initial_mrr ELSE 0 END) as churned_mrr,
            AVG(CASE WHEN status = 'Active' THEN churn_probability END) as avg_churn_probability,
            SUM(CASE WHEN status = 'Active' THEN current_mrr * 12 * COALESCE(churn_probability, 0) ELSE 0 END) as arr_at_risk
        FROM customers
        WHERE 1=1 {date_filter}
    """

    df = query_to_df(query)

    if df.empty:
        return {}

    row = df.iloc[0]
    total = row['total_customers']
    churned = row['churned_customers']

    return {
        'total_customers': int(total),
        'active_customers': int(row['active_customers']),
        'churned_customers': int(churned),
        'churn_rate': churned / total if total > 0 else 0,
        'active_mrr': float(row['active_mrr']),
        'churned_mrr': float(row['churned_mrr']),
        'avg_churn_probability': float(row['avg_churn_probability']) if pd.notna(row['avg_churn_probability']) else 0,
        'arr_at_risk': float(row['arr_at_risk']) if pd.notna(row['arr_at_risk']) else 0
    }


def get_churn_by_segment(
    segment_field: str = 'company_size'
) -> List[Dict[str, Any]]:
    """Get churn metrics by segment."""
    # Validate segment field
    segment_field = validate_segment_field(segment_field)

    query = f"""
        SELECT
            {segment_field} as segment,
            COUNT(*) as total_customers,
            SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN status = 'Churned' THEN 1 ELSE 0 END) as churned,
            SUM(CASE WHEN status = 'Active' THEN current_mrr ELSE 0 END) as active_mrr,
            SUM(CASE WHEN status = 'Churned' THEN initial_mrr ELSE 0 END) as churned_mrr,
            AVG(CASE WHEN status = 'Active' THEN churn_probability END) as avg_churn_prob
        FROM customers
        GROUP BY {segment_field}
        ORDER BY churned_mrr DESC
    """

    df = query_to_df(query)

    results = []
    for _, row in df.iterrows():
        total = row['total_customers']
        churned = row['churned']

        results.append({
            'segment': row['segment'],
            'total_customers': int(total),
            'active_customers': int(row['active']),
            'churned_customers': int(churned),
            'churn_rate': churned / total if total > 0 else 0,
            'active_mrr': float(row['active_mrr']),
            'churned_mrr': float(row['churned_mrr']),
            'arr_at_risk': float(row['active_mrr']) * 12 * float(row['avg_churn_prob']) if pd.notna(row['avg_churn_prob']) else 0,
            'avg_churn_probability': float(row['avg_churn_prob']) if pd.notna(row['avg_churn_prob']) else 0
        })

    return results


def get_churn_predictions(
    min_probability: float = 0.0,
    max_results: int = 100
) -> List[Dict[str, Any]]:
    """Get customers sorted by churn probability."""
    query = f"""
        SELECT
            c.customer_id,
            c.company_name,
            c.company_size,
            c.industry,
            c.current_mrr,
            c.start_date,
            c.churn_probability,
            c.health_score,
            c.latest_nps_score,
            DATEDIFF('day', c.start_date, CURRENT_DATE) as tenure_days
        FROM customers c
        WHERE c.status = 'Active'
        AND c.churn_probability >= {min_probability}
        ORDER BY c.churn_probability DESC
        LIMIT {max_results}
    """

    df = query_to_df(query)

    results = []
    for _, row in df.iterrows():
        results.append({
            'customer_id': row['customer_id'],
            'company_name': row['company_name'],
            'company_size': row['company_size'],
            'industry': row['industry'],
            'current_mrr': float(row['current_mrr']),
            'arr': float(row['current_mrr']) * 12,
            'tenure_days': int(row['tenure_days']),
            'churn_probability': float(row['churn_probability']) if pd.notna(row['churn_probability']) else 0,
            'health_score': row['health_score'] if pd.notna(row['health_score']) else None,
            'nps_score': int(row['latest_nps_score']) if pd.notna(row['latest_nps_score']) else None,
            'arr_at_risk': float(row['current_mrr']) * 12 * float(row['churn_probability']) if pd.notna(row['churn_probability']) else 0
        })

    return results


def get_churn_drivers(customer_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get churn drivers (feature importance).

    If customer_id is provided, returns specific drivers for that customer.
    Otherwise, returns overall feature importance.
    """
    if customer_id:
        return _get_customer_churn_drivers(customer_id)
    return _get_overall_churn_drivers()


def _get_customer_churn_drivers(customer_id: str) -> List[Dict[str, Any]]:
    """Get specific churn drivers for a customer."""
    # Validate customer ID
    if not validate_customer_id(customer_id):
        raise ValueError("Invalid customer ID format")

    # Get customer data
    customer_query = f"""
        SELECT
            c.*,
            DATEDIFF('day', c.start_date, CURRENT_DATE) as tenure_days
        FROM customers c
        WHERE c.customer_id = '{customer_id}'
    """
    customer_df = query_to_df(customer_query)

    if customer_df.empty:
        return []

    customer = customer_df.iloc[0]

    # Get recent usage
    usage_query = f"""
        SELECT
            AVG(logins) as avg_logins,
            AVG(api_calls) as avg_api_calls,
            AVG(reports_generated) as avg_reports,
            AVG(team_members_active) as avg_team_active,
            COUNT(*) as usage_days
        FROM usage_events
        WHERE customer_id = '{customer_id}'
        AND event_date >= CURRENT_DATE - INTERVAL 30 DAY
    """
    usage_df = query_to_df(usage_query)

    # Get segment benchmarks
    benchmark_query = f"""
        SELECT
            AVG(u.logins) as bench_logins,
            AVG(u.api_calls) as bench_api_calls,
            AVG(u.reports_generated) as bench_reports
        FROM usage_events u
        JOIN customers c ON u.customer_id = c.customer_id
        WHERE c.company_size = '{customer['company_size']}'
        AND c.status = 'Active'
        AND u.event_date >= CURRENT_DATE - INTERVAL 30 DAY
    """
    benchmark_df = query_to_df(benchmark_query)

    drivers = []

    # Usage-based drivers
    if not usage_df.empty and not benchmark_df.empty:
        usage = usage_df.iloc[0]
        bench = benchmark_df.iloc[0]

        if pd.notna(usage['avg_logins']) and pd.notna(bench['bench_logins']) and bench['bench_logins'] > 0:
            login_ratio = usage['avg_logins'] / bench['bench_logins']
            if login_ratio < 0.5:
                drivers.append({
                    'factor': 'Low Login Activity',
                    'impact': 'High',
                    'value': f"{login_ratio:.0%} of segment average",
                    'recommendation': 'Schedule product training session'
                })

        if pd.notna(usage['avg_api_calls']) and pd.notna(bench['bench_api_calls']) and bench['bench_api_calls'] > 0:
            api_ratio = usage['avg_api_calls'] / bench['bench_api_calls']
            if api_ratio < 0.3:
                drivers.append({
                    'factor': 'Low API Usage',
                    'impact': 'High',
                    'value': f"{api_ratio:.0%} of segment average",
                    'recommendation': 'Review integration status'
                })

    # NPS-based driver
    if customer['latest_nps_score'] is not None and customer['latest_nps_score'] <= 6:
        drivers.append({
            'factor': 'Detractor NPS Score',
            'impact': 'High',
            'value': f"Score: {customer['latest_nps_score']}",
            'recommendation': 'Conduct customer success call'
        })
    elif customer['latest_nps_score'] is not None and customer['latest_nps_score'] <= 8:
        drivers.append({
            'factor': 'Passive NPS Score',
            'impact': 'Medium',
            'value': f"Score: {customer['latest_nps_score']}",
            'recommendation': 'Identify improvement opportunities'
        })

    # Tenure-based driver
    if customer['tenure_days'] < 90:
        drivers.append({
            'factor': 'New Customer (< 90 days)',
            'impact': 'Medium',
            'value': f"{customer['tenure_days']} days",
            'recommendation': 'Ensure smooth onboarding completion'
        })

    return drivers


def _get_overall_churn_drivers() -> List[Dict[str, Any]]:
    """Get overall feature importance for churn."""
    # Compare churned vs active customers
    query = """
        SELECT
            c.status,
            AVG(DATEDIFF('day', c.start_date,
                CASE WHEN c.status = 'Churned' THEN c.churn_date ELSE CURRENT_DATE END)) as avg_tenure,
            AVG(c.latest_nps_score) as avg_nps,
            AVG(c.initial_mrr) as avg_initial_mrr,
            c.company_size,
            COUNT(*) as customer_count
        FROM customers c
        GROUP BY c.status, c.company_size
    """

    df = query_to_df(query)

    # Simulated feature importance based on typical B2B SaaS patterns
    drivers = [
        {
            'factor': 'Usage Decline (30-day trend)',
            'importance': 0.35,
            'direction': 'Declining usage strongly predicts churn',
            'actionable': True
        },
        {
            'factor': 'NPS Score',
            'importance': 0.20,
            'direction': 'Detractors (0-6) churn 3x more than promoters',
            'actionable': True
        },
        {
            'factor': 'Time Since Last Login',
            'importance': 0.18,
            'direction': '7+ days without login increases risk',
            'actionable': True
        },
        {
            'factor': 'Company Size',
            'importance': 0.12,
            'direction': 'SMB churns at higher rate than Enterprise',
            'actionable': False
        },
        {
            'factor': 'Tenure',
            'importance': 0.10,
            'direction': 'First 90 days have highest churn risk',
            'actionable': True
        },
        {
            'factor': 'Support Tickets',
            'importance': 0.05,
            'direction': 'Unresolved tickets correlate with churn',
            'actionable': True
        }
    ]

    return drivers


def get_at_risk_customers(
    risk_threshold: float = 0.5,
    min_mrr: float = 0
) -> List[Dict[str, Any]]:
    """Get customers above churn risk threshold."""
    query = f"""
        SELECT
            c.customer_id,
            c.company_name,
            c.company_size,
            c.industry,
            c.current_mrr,
            c.churn_probability,
            c.health_score,
            c.latest_nps_score,
            c.start_date,
            DATEDIFF('day', c.start_date, CURRENT_DATE) as tenure_days
        FROM customers c
        WHERE c.status = 'Active'
        AND c.churn_probability >= {risk_threshold}
        AND c.current_mrr >= {min_mrr}
        ORDER BY (c.current_mrr * c.churn_probability) DESC
    """

    df = query_to_df(query)

    results = []
    for _, row in df.iterrows():
        arr = float(row['current_mrr']) * 12 if pd.notna(row['current_mrr']) else 0
        churn_prob = float(row['churn_probability']) if pd.notna(row['churn_probability']) else 0

        results.append({
            'customer_id': row['customer_id'],
            'company_name': row['company_name'],
            'company_size': row['company_size'],
            'industry': row['industry'],
            'current_mrr': float(row['current_mrr']) if pd.notna(row['current_mrr']) else 0,
            'arr': arr,
            'churn_probability': churn_prob,
            'arr_at_risk': arr * churn_prob,
            'health_score': row['health_score'] if pd.notna(row['health_score']) else None,
            'nps_score': int(row['latest_nps_score']) if pd.notna(row['latest_nps_score']) else None,
            'tenure_days': int(row['tenure_days']) if pd.notna(row['tenure_days']) else 0,
            'recommended_action': _get_recommended_action(row)
        })

    return results


def _get_recommended_action(customer_row) -> str:
    """Determine recommended action based on customer attributes."""
    nps = customer_row['latest_nps_score']
    health = customer_row['health_score']
    mrr = customer_row['current_mrr']

    if pd.notna(nps) and nps <= 6:
        return "Executive escalation - detractor feedback"
    elif pd.notna(health) and health == 'Red':
        return "Urgent CS intervention - health critical"
    elif pd.notna(mrr) and mrr > 5000:
        return "Strategic account review"
    else:
        return "Standard re-engagement campaign"


def calculate_churn_features(customer_id: str) -> Dict[str, Any]:
    """Calculate all features used for churn prediction."""
    # Validate customer ID
    if not validate_customer_id(customer_id):
        raise ValueError("Invalid customer ID format")

    # Get customer base data
    customer_query = f"""
        SELECT
            c.*,
            DATEDIFF('day', c.start_date, CURRENT_DATE) as tenure_days
        FROM customers c
        WHERE c.customer_id = '{customer_id}'
    """
    customer_df = query_to_df(customer_query)

    if customer_df.empty:
        return {}

    customer = customer_df.iloc[0]

    # Get usage features
    usage_query = f"""
        SELECT
            AVG(logins) as avg_logins_30d,
            AVG(api_calls) as avg_api_30d,
            AVG(team_members_active) as avg_team_30d,
            STDDEV(logins) as std_logins,
            MIN(logins) as min_logins,
            MAX(logins) as max_logins
        FROM usage_events
        WHERE customer_id = '{customer_id}'
        AND event_date >= CURRENT_DATE - INTERVAL 30 DAY
    """
    usage_df = query_to_df(usage_query)

    # Get usage trend (compare last 14 days to prior 14 days)
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

    # Get last login
    last_login_query = f"""
        SELECT MAX(event_date) as last_login
        FROM usage_events
        WHERE customer_id = '{customer_id}'
        AND logins > 0
    """
    last_login_df = query_to_df(last_login_query)

    features = {
        'customer_id': customer_id,
        'tenure_days': int(customer['tenure_days']),
        'company_size': customer['company_size'],
        'industry': customer['industry'],
        'current_mrr': float(customer['current_mrr']),
        'nps_score': int(customer['latest_nps_score']) if customer['latest_nps_score'] else None,
    }

    if not usage_df.empty:
        usage = usage_df.iloc[0]
        features.update({
            'avg_logins_30d': float(usage['avg_logins_30d']) if usage['avg_logins_30d'] else 0,
            'avg_api_calls_30d': float(usage['avg_api_30d']) if usage['avg_api_30d'] else 0,
            'avg_team_active_30d': float(usage['avg_team_30d']) if usage['avg_team_30d'] else 0,
            'login_volatility': float(usage['std_logins']) if usage['std_logins'] else 0,
        })

    if not trend_df.empty:
        trend = trend_df.iloc[0]
        recent = trend['recent_logins'] or 0
        prior = trend['prior_logins'] or 1
        features['usage_trend'] = (recent - prior) / prior if prior > 0 else 0

    if not last_login_df.empty and pd.notna(last_login_df.iloc[0]['last_login']):
        last_login = last_login_df.iloc[0]['last_login']
        if hasattr(last_login, 'date'):
            last_login = last_login.date()
        features['days_since_login'] = (date.today() - last_login).days
    else:
        features['days_since_login'] = 999

    return features


def get_churn_cohort_analysis() -> List[Dict[str, Any]]:
    """Analyze churn by customer cohort."""
    query = """
        SELECT
            DATE_TRUNC('month', start_date) as cohort_month,
            COUNT(*) as total_customers,
            SUM(CASE WHEN status = 'Churned' THEN 1 ELSE 0 END) as churned,
            SUM(initial_mrr) as initial_mrr,
            SUM(CASE WHEN status = 'Churned' THEN initial_mrr ELSE 0 END) as churned_mrr,
            AVG(CASE WHEN status = 'Churned'
                THEN DATEDIFF('day', start_date, churn_date) END) as avg_days_to_churn
        FROM customers
        GROUP BY DATE_TRUNC('month', start_date)
        ORDER BY cohort_month
    """

    df = query_to_df(query)

    results = []
    for _, row in df.iterrows():
        total = row['total_customers']
        churned = row['churned']

        results.append({
            'cohort': row['cohort_month'].strftime('%Y-%m') if hasattr(row['cohort_month'], 'strftime') else str(row['cohort_month']),
            'total_customers': int(total),
            'churned_customers': int(churned),
            'churn_rate': churned / total if total > 0 else 0,
            'initial_mrr': float(row['initial_mrr']),
            'churned_mrr': float(row['churned_mrr']),
            'avg_days_to_churn': float(row['avg_days_to_churn']) if pd.notna(row['avg_days_to_churn']) else None
        })

    return results


def get_intervention_recommendations(budget: float = 50000) -> List[Dict[str, Any]]:
    """
    Get prioritized intervention recommendations.

    Optimizes for maximum ARR saved given intervention budget.
    """
    # Get at-risk customers
    at_risk = get_at_risk_customers(risk_threshold=0.3, min_mrr=500)

    if not at_risk:
        return []

    # Assume intervention costs and effectiveness
    INTERVENTION_COST = 500  # Cost per intervention
    SAVE_RATE = 0.30  # 30% of interventions prevent churn

    # Calculate expected value for each customer
    for customer in at_risk:
        expected_arr_saved = customer['arr_at_risk'] * SAVE_RATE
        roi = (expected_arr_saved - INTERVENTION_COST) / INTERVENTION_COST
        customer['expected_arr_saved'] = expected_arr_saved
        customer['intervention_roi'] = roi
        customer['priority_score'] = expected_arr_saved * (1 if customer['health_score'] == 'Red' else 0.7)

    # Sort by priority and select within budget
    sorted_customers = sorted(at_risk, key=lambda x: x['priority_score'], reverse=True)

    recommendations = []
    total_cost = 0
    total_expected_saved = 0

    for customer in sorted_customers:
        if total_cost + INTERVENTION_COST > budget:
            break

        total_cost += INTERVENTION_COST
        total_expected_saved += customer['expected_arr_saved']

        recommendations.append({
            'priority': len(recommendations) + 1,
            'customer_id': customer['customer_id'],
            'company_name': customer['company_name'],
            'arr': customer['arr'],
            'churn_probability': customer['churn_probability'],
            'expected_arr_saved': customer['expected_arr_saved'],
            'intervention_cost': INTERVENTION_COST,
            'roi': customer['intervention_roi'],
            'recommended_action': customer['recommended_action']
        })

    return {
        'recommendations': recommendations,
        'summary': {
            'total_cost': total_cost,
            'total_expected_arr_saved': total_expected_saved,
            'customers_to_contact': len(recommendations),
            'expected_roi': (total_expected_saved - total_cost) / total_cost if total_cost > 0 else 0
        }
    }
