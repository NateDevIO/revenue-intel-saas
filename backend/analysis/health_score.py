"""
Customer Health Scoring Module
==============================

Provides customer health scoring including:
- Multi-factor health score calculation
- Health score components breakdown
- Health trend analysis
- Segment health distribution
- Health-based customer segmentation
"""

from typing import Optional, Dict, List, Any
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


# Health score component weights
WEIGHTS = {
    'usage': 0.35,       # Product usage metrics
    'engagement': 0.25,  # Login frequency, feature adoption
    'sentiment': 0.20,   # NPS, support interactions
    'financial': 0.20,   # Payment history, expansion
}

# Health score thresholds
THRESHOLDS = {
    'green': 70,   # >= 70 is healthy
    'yellow': 40,  # 40-69 is at risk
    'red': 0,      # < 40 is critical
}


def calculate_health_score(customer_id: str) -> Dict[str, Any]:
    """
    Calculate comprehensive health score for a customer.

    Returns score (0-100) with component breakdown.
    """
    # Validate customer ID
    if not validate_customer_id(customer_id):
        return {'error': 'Invalid customer ID format'}

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
        return {'error': 'Customer not found'}

    customer = customer_df.iloc[0]

    # Calculate each component
    usage_score = _calculate_usage_score(customer_id, customer['company_size'])
    engagement_score = _calculate_engagement_score(customer_id)
    sentiment_score = _calculate_sentiment_score(customer_id, customer['latest_nps_score'])
    financial_score = _calculate_financial_score(customer_id, customer['current_mrr'], customer['initial_mrr'])

    # Calculate weighted total
    total_score = (
        usage_score['score'] * WEIGHTS['usage'] +
        engagement_score['score'] * WEIGHTS['engagement'] +
        sentiment_score['score'] * WEIGHTS['sentiment'] +
        financial_score['score'] * WEIGHTS['financial']
    )

    # Determine health category
    if total_score >= THRESHOLDS['green']:
        health_category = 'Green'
    elif total_score >= THRESHOLDS['yellow']:
        health_category = 'Yellow'
    else:
        health_category = 'Red'

    return {
        'customer_id': customer_id,
        'total_score': round(total_score, 1),
        'health_category': health_category,
        'components': {
            'usage': usage_score,
            'engagement': engagement_score,
            'sentiment': sentiment_score,
            'financial': financial_score
        },
        'weights': WEIGHTS,
        'recommendations': _generate_recommendations(
            usage_score, engagement_score, sentiment_score, financial_score
        )
    }


def _calculate_usage_score(customer_id: str, company_size: str) -> Dict[str, Any]:
    """Calculate usage component score."""
    # Get recent usage (last 30 days)
    usage_query = f"""
        SELECT
            AVG(logins) as avg_logins,
            AVG(api_calls) as avg_api_calls,
            AVG(reports_generated) as avg_reports,
            AVG(team_members_active) as avg_team,
            AVG(integrations_used) as avg_integrations,
            COUNT(*) as days_with_data
        FROM usage_events
        WHERE customer_id = '{customer_id}'
        AND event_date >= CURRENT_DATE - INTERVAL 30 DAY
    """
    usage_df = query_to_df(usage_query)

    # Get segment benchmarks
    benchmark_query = f"""
        SELECT
            AVG(u.logins) as bench_logins,
            AVG(u.api_calls) as bench_api,
            AVG(u.reports_generated) as bench_reports,
            AVG(u.team_members_active) as bench_team
        FROM usage_events u
        JOIN customers c ON u.customer_id = c.customer_id
        WHERE c.company_size = '{company_size}'
        AND c.status = 'Active'
        AND u.event_date >= CURRENT_DATE - INTERVAL 30 DAY
    """
    bench_df = query_to_df(benchmark_query)

    if usage_df.empty or bench_df.empty:
        return {'score': 50, 'details': 'Insufficient data', 'factors': []}

    usage = usage_df.iloc[0]
    bench = bench_df.iloc[0]

    factors = []
    scores = []

    # Compare each metric to benchmark
    if pd.notna(usage['avg_logins']) and pd.notna(bench['bench_logins']) and bench['bench_logins'] > 0:
        ratio = usage['avg_logins'] / bench['bench_logins']
        score = min(100, ratio * 100)
        scores.append(score)
        factors.append({
            'metric': 'Daily Logins',
            'value': round(usage['avg_logins'], 1),
            'benchmark': round(bench['bench_logins'], 1),
            'ratio': round(ratio, 2),
            'status': 'Good' if ratio >= 0.8 else 'Low'
        })

    if pd.notna(usage['avg_api_calls']) and pd.notna(bench['bench_api']) and bench['bench_api'] > 0:
        ratio = usage['avg_api_calls'] / bench['bench_api']
        score = min(100, ratio * 100)
        scores.append(score)
        factors.append({
            'metric': 'API Calls',
            'value': round(usage['avg_api_calls'], 0),
            'benchmark': round(bench['bench_api'], 0),
            'ratio': round(ratio, 2),
            'status': 'Good' if ratio >= 0.8 else 'Low'
        })

    if pd.notna(usage['avg_team']) and pd.notna(bench['bench_team']) and bench['bench_team'] > 0:
        ratio = usage['avg_team'] / bench['bench_team']
        score = min(100, ratio * 100)
        scores.append(score)
        factors.append({
            'metric': 'Active Team Members',
            'value': round(usage['avg_team'], 1),
            'benchmark': round(bench['bench_team'], 1),
            'ratio': round(ratio, 2),
            'status': 'Good' if ratio >= 0.8 else 'Low'
        })

    final_score = np.mean(scores) if scores else 50

    return {
        'score': round(final_score, 1),
        'weight': WEIGHTS['usage'],
        'factors': factors
    }


def _calculate_engagement_score(customer_id: str) -> Dict[str, Any]:
    """Calculate engagement component score."""
    # Check login frequency and recency
    engagement_query = f"""
        SELECT
            COUNT(DISTINCT event_date) as active_days,
            MAX(event_date) as last_active,
            DATEDIFF('day', MAX(event_date), CURRENT_DATE) as days_since_active
        FROM usage_events
        WHERE customer_id = '{customer_id}'
        AND event_date >= CURRENT_DATE - INTERVAL 30 DAY
        AND logins > 0
    """
    eng_df = query_to_df(engagement_query)

    if eng_df.empty:
        return {'score': 30, 'details': 'No recent activity', 'factors': []}

    eng = eng_df.iloc[0]
    factors = []
    scores = []

    # Active days score (out of 22 business days)
    active_days = int(eng['active_days']) if eng['active_days'] else 0
    active_score = min(100, (active_days / 22) * 100)
    scores.append(active_score)
    factors.append({
        'metric': 'Active Days (30d)',
        'value': active_days,
        'target': 22,
        'status': 'Good' if active_days >= 15 else 'Low'
    })

    # Recency score
    days_since = int(eng['days_since_active']) if eng['days_since_active'] else 30
    recency_score = max(0, 100 - (days_since * 10))  # Lose 10 points per day
    scores.append(recency_score)
    factors.append({
        'metric': 'Days Since Last Login',
        'value': days_since,
        'target': 1,
        'status': 'Good' if days_since <= 3 else 'Concerning' if days_since <= 7 else 'Critical'
    })

    final_score = np.mean(scores) if scores else 50

    return {
        'score': round(final_score, 1),
        'weight': WEIGHTS['engagement'],
        'factors': factors
    }


def _calculate_sentiment_score(customer_id: str, latest_nps: Optional[int]) -> Dict[str, Any]:
    """Calculate sentiment component score."""
    factors = []
    scores = []

    # NPS score
    if latest_nps is not None:
        nps_score = latest_nps * 10  # Convert 0-10 to 0-100
        scores.append(nps_score)
        nps_category = 'Promoter' if latest_nps >= 9 else 'Passive' if latest_nps >= 7 else 'Detractor'
        factors.append({
            'metric': 'NPS Score',
            'value': latest_nps,
            'category': nps_category,
            'status': 'Good' if latest_nps >= 7 else 'Concerning'
        })
    else:
        scores.append(60)  # Neutral if no NPS
        factors.append({
            'metric': 'NPS Score',
            'value': 'No response',
            'status': 'Unknown'
        })

    # Check for negative NPS feedback
    feedback_query = f"""
        SELECT
            score,
            response_text,
            survey_date
        FROM nps_surveys
        WHERE customer_id = '{customer_id}'
        AND responded = true
        ORDER BY survey_date DESC
        LIMIT 3
    """
    feedback_df = query_to_df(feedback_query)

    if not feedback_df.empty:
        recent_scores = feedback_df['score'].dropna().tolist()
        if len(recent_scores) >= 2:
            trend = recent_scores[0] - recent_scores[-1]
            trend_status = 'Improving' if trend > 0 else 'Declining' if trend < 0 else 'Stable'
            factors.append({
                'metric': 'NPS Trend',
                'value': f"{'+' if trend > 0 else ''}{trend}",
                'status': trend_status
            })

    final_score = np.mean(scores) if scores else 50

    return {
        'score': round(final_score, 1),
        'weight': WEIGHTS['sentiment'],
        'factors': factors
    }


def _calculate_financial_score(
    customer_id: str,
    current_mrr: float,
    initial_mrr: float
) -> Dict[str, Any]:
    """Calculate financial health component score."""
    factors = []
    scores = []

    # MRR growth
    if initial_mrr > 0:
        mrr_growth = (current_mrr - initial_mrr) / initial_mrr
        growth_score = min(100, max(0, 50 + (mrr_growth * 100)))
        scores.append(growth_score)
        factors.append({
            'metric': 'MRR Growth',
            'value': f"{mrr_growth:+.1%}",
            'initial_mrr': round(initial_mrr, 2),
            'current_mrr': round(current_mrr, 2),
            'status': 'Good' if mrr_growth >= 0 else 'Contracting'
        })

    # Check expansion history
    expansion_query = f"""
        SELECT
            COUNT(CASE WHEN status = 'Won' THEN 1 END) as expansions,
            COUNT(CASE WHEN movement_type = 'Contraction' THEN 1 END) as contractions
        FROM (
            SELECT status, NULL as movement_type FROM expansion_opportunities WHERE customer_id = '{customer_id}'
            UNION ALL
            SELECT NULL as status, movement_type FROM mrr_movements WHERE customer_id = '{customer_id}'
        )
    """
    exp_df = query_to_df(expansion_query)

    if not exp_df.empty:
        exp = exp_df.iloc[0]
        expansions = int(exp['expansions']) if exp['expansions'] else 0
        contractions = int(exp['contractions']) if exp['contractions'] else 0

        if expansions > 0:
            scores.append(80)
            factors.append({
                'metric': 'Expansion History',
                'value': f"{expansions} expansions",
                'status': 'Positive'
            })
        if contractions > 0:
            scores.append(40)
            factors.append({
                'metric': 'Contractions',
                'value': f"{contractions} downgrades",
                'status': 'Concerning'
            })

    final_score = np.mean(scores) if scores else 50

    return {
        'score': round(final_score, 1),
        'weight': WEIGHTS['financial'],
        'factors': factors
    }


def _generate_recommendations(
    usage: Dict,
    engagement: Dict,
    sentiment: Dict,
    financial: Dict
) -> List[str]:
    """Generate actionable recommendations based on scores."""
    recommendations = []

    if usage['score'] < 50:
        recommendations.append("Schedule product training session to improve feature adoption")

    if engagement['score'] < 50:
        for factor in engagement.get('factors', []):
            if factor.get('metric') == 'Days Since Last Login' and factor.get('value', 0) > 7:
                recommendations.append("Urgent: Re-engage customer - no login in 7+ days")
                break

    if sentiment['score'] < 50:
        recommendations.append("Conduct customer success call to address satisfaction concerns")

    if financial['score'] < 50:
        recommendations.append("Review account for value delivery and expansion opportunities")

    if not recommendations:
        recommendations.append("Continue current engagement - customer is healthy")

    return recommendations


def get_health_distribution() -> Dict[str, Any]:
    """Get distribution of health scores across all customers."""
    query = """
        SELECT
            health_score,
            COUNT(*) as customer_count,
            SUM(current_mrr) as total_mrr
        FROM customers
        WHERE status = 'Active'
        GROUP BY health_score
    """
    df = query_to_df(query)

    distribution = {
        'Green': {'count': 0, 'mrr': 0},
        'Yellow': {'count': 0, 'mrr': 0},
        'Red': {'count': 0, 'mrr': 0}
    }

    for _, row in df.iterrows():
        category = row['health_score']
        if category in distribution:
            distribution[category]['count'] = int(row['customer_count'])
            distribution[category]['mrr'] = float(row['total_mrr'])

    total_customers = sum(d['count'] for d in distribution.values())
    total_mrr = sum(d['mrr'] for d in distribution.values())

    for category in distribution:
        distribution[category]['percentage'] = distribution[category]['count'] / total_customers if total_customers > 0 else 0
        distribution[category]['mrr_percentage'] = distribution[category]['mrr'] / total_mrr if total_mrr > 0 else 0

    return {
        'distribution': distribution,
        'total_customers': total_customers,
        'total_mrr': total_mrr
    }


def get_health_by_segment(segment_field: str = 'company_size') -> List[Dict[str, Any]]:
    """Get health distribution by segment."""
    # Validate segment field
    segment_field = validate_segment_field(segment_field)

    query = f"""
        SELECT
            {segment_field} as segment,
            health_score,
            COUNT(*) as customer_count,
            SUM(current_mrr) as total_mrr,
            AVG(churn_probability) as avg_churn_prob
        FROM customers
        WHERE status = 'Active'
        GROUP BY {segment_field}, health_score
        ORDER BY {segment_field}, health_score
    """
    df = query_to_df(query)

    # Pivot the data
    segments = {}
    for _, row in df.iterrows():
        segment = row['segment']
        health = row['health_score']

        if segment not in segments:
            segments[segment] = {
                'segment': segment,
                'Green': {'count': 0, 'mrr': 0},
                'Yellow': {'count': 0, 'mrr': 0},
                'Red': {'count': 0, 'mrr': 0},
                'total_customers': 0,
                'total_mrr': 0,
                'avg_churn_probability': 0
            }

        if health in segments[segment]:
            segments[segment][health]['count'] = int(row['customer_count'])
            segments[segment][health]['mrr'] = float(row['total_mrr'])

        segments[segment]['total_customers'] += int(row['customer_count'])
        segments[segment]['total_mrr'] += float(row['total_mrr'])

    # Calculate percentages
    results = []
    for segment_data in segments.values():
        total = segment_data['total_customers']
        for health in ['Green', 'Yellow', 'Red']:
            segment_data[health]['percentage'] = segment_data[health]['count'] / total if total > 0 else 0
        results.append(segment_data)

    return results


def get_health_trend(days: int = 90) -> List[Dict[str, Any]]:
    """Get health score trend over time (simulated for static data)."""
    # Since we have static health scores, we'll simulate a trend
    current_dist = get_health_distribution()

    # Generate simulated historical trend
    results = []
    for i in range(days, 0, -7):  # Weekly snapshots
        snapshot_date = date.today() - timedelta(days=i)

        # Simulate slight variations
        variation = np.random.uniform(0.95, 1.05)

        results.append({
            'date': snapshot_date.strftime('%Y-%m-%d'),
            'green_count': int(current_dist['distribution']['Green']['count'] * variation),
            'yellow_count': int(current_dist['distribution']['Yellow']['count'] * variation),
            'red_count': int(current_dist['distribution']['Red']['count'] * variation),
            'avg_score': 65 + np.random.uniform(-5, 5)  # Simulated average
        })

    return results


def get_customers_by_health(
    health_category: str,
    limit: int = 50,
    order_by: str = 'mrr'
) -> List[Dict[str, Any]]:
    """Get customers filtered by health category."""
    # Validate health category
    valid_health = ['Green', 'Yellow', 'Red']
    if health_category not in valid_health:
        raise ValueError(f"Invalid health category. Must be one of: {', '.join(valid_health)}")

    # Validate order_by
    valid_order = ['mrr', 'churn_probability']
    if order_by not in valid_order:
        raise ValueError(f"Invalid order_by. Must be one of: {', '.join(valid_order)}")

    # Validate limit
    if not isinstance(limit, int) or limit < 1 or limit > 200:
        raise ValueError("Limit must be an integer between 1 and 200")

    order_field = 'current_mrr' if order_by == 'mrr' else 'churn_probability'
    order_dir = 'DESC' if order_by == 'mrr' else 'DESC'

    query = f"""
        SELECT
            customer_id,
            company_name,
            company_size,
            industry,
            current_mrr,
            churn_probability,
            health_score,
            latest_nps_score,
            start_date,
            DATEDIFF('day', start_date, CURRENT_DATE) as tenure_days
        FROM customers
        WHERE status = 'Active'
        AND health_score = '{health_category}'
        ORDER BY {order_field} {order_dir}
        LIMIT {limit}
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
            'churn_probability': float(row['churn_probability']) if pd.notna(row['churn_probability']) else 0,
            'health_score': row['health_score'] if pd.notna(row['health_score']) else None,
            'nps_score': int(row['latest_nps_score']) if pd.notna(row['latest_nps_score']) else None,
            'tenure_days': int(row['tenure_days'])
        })

    return results


def update_all_health_scores():
    """Recalculate health scores for all active customers."""
    # Get all active customer IDs
    query = "SELECT customer_id FROM customers WHERE status = 'Active'"
    df = query_to_df(query)

    updated = 0
    for _, row in df.iterrows():
        try:
            result = calculate_health_score(row['customer_id'])
            # In a real implementation, you would update the database here
            updated += 1
        except Exception as e:
            print(f"Error updating {row['customer_id']}: {e}")

    return {'updated_count': updated}
