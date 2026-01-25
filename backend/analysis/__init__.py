"""
Analysis Engine Module
======================

Provides comprehensive analytics for the SaaS Revenue Lifecycle Analyzer:
- Funnel diagnostics and conversion analysis
- Churn prediction and risk assessment
- Revenue intelligence and LTV/CAC analysis
- Customer health scoring
"""

from .funnel import (
    get_funnel_summary,
    get_stage_conversion_rates,
    get_funnel_by_segment,
    get_velocity_metrics,
    get_cohort_analysis,
    get_loss_reasons,
    get_rep_performance,
    get_cac_by_channel,
)

from .churn import (
    get_churn_summary,
    get_churn_by_segment,
    get_churn_predictions,
    get_churn_drivers,
    get_at_risk_customers,
    calculate_churn_features,
    get_churn_cohort_analysis,
    get_intervention_recommendations,
)

from .revenue import (
    get_revenue_summary,
    get_nrr_trend,
    get_ltv_cac_by_segment,
    get_ltv_cac_summary,
    get_mrr_waterfall,
    get_revenue_at_risk,
    get_revenue_leakage_analysis,
    get_action_priority_matrix,
    run_monte_carlo_simulation,
    get_industry_benchmarks,
)

from .health_score import (
    calculate_health_score,
    get_health_distribution,
    get_health_by_segment,
    get_health_trend,
    get_customers_by_health,
    update_all_health_scores,
    WEIGHTS as HEALTH_WEIGHTS,
    THRESHOLDS as HEALTH_THRESHOLDS,
)

__all__ = [
    # Funnel
    'get_funnel_summary',
    'get_stage_conversion_rates',
    'get_funnel_by_segment',
    'get_velocity_metrics',
    'get_cohort_analysis',
    'get_loss_reasons',
    'get_rep_performance',
    'get_cac_by_channel',
    # Churn
    'get_churn_summary',
    'get_churn_by_segment',
    'get_churn_predictions',
    'get_churn_drivers',
    'get_at_risk_customers',
    'calculate_churn_features',
    'get_churn_cohort_analysis',
    'get_intervention_recommendations',
    # Revenue
    'get_revenue_summary',
    'get_nrr_trend',
    'get_ltv_cac_by_segment',
    'get_ltv_cac_summary',
    'get_mrr_waterfall',
    'get_revenue_at_risk',
    'get_revenue_leakage_analysis',
    'get_action_priority_matrix',
    'run_monte_carlo_simulation',
    'get_industry_benchmarks',
    # Health Score
    'calculate_health_score',
    'get_health_distribution',
    'get_health_by_segment',
    'get_health_trend',
    'get_customers_by_health',
    'update_all_health_scores',
    'HEALTH_WEIGHTS',
    'HEALTH_THRESHOLDS',
]
