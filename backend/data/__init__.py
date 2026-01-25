"""
Data Layer Module
=================

Provides data generation, schema definitions, and database access
for the SaaS Revenue Lifecycle Analyzer.
"""

from .assumptions import DEFAULT_ASSUMPTIONS, AllAssumptions, get_assumptions
from .schema import (
    Lead, Opportunity, StageTransition, Customer, UsageEvent,
    SalesRep, MarketingSpend, MRRMovement, NPSSurvey, ExpansionOpportunity,
    CompanySize, LeadChannel, Industry, OpportunityStage, CustomerStatus,
    HealthScore, MRRMovementType, ExpansionStatus,
    ExecutiveSummary, FunnelConversion, CohortMetrics, CustomerHealth,
    RevenueAtRisk, ActionItem, SimulatorResult, LTVCACMetrics, WaterfallItem,
    RepPerformance
)
from .database import (
    get_connection, get_db, init_database, load_dataframe,
    query_to_df, execute_query, get_table_count, table_exists,
    get_database_stats, get_funnel_data, get_customer_health_data,
    get_mrr_movements_summary, get_rep_performance
)
from .generator import SyntheticDataGenerator, generate_and_save

__all__ = [
    # Assumptions
    'DEFAULT_ASSUMPTIONS', 'AllAssumptions', 'get_assumptions',
    # Schema models
    'Lead', 'Opportunity', 'StageTransition', 'Customer', 'UsageEvent',
    'SalesRep', 'MarketingSpend', 'MRRMovement', 'NPSSurvey', 'ExpansionOpportunity',
    'CompanySize', 'LeadChannel', 'Industry', 'OpportunityStage', 'CustomerStatus',
    'HealthScore', 'MRRMovementType', 'ExpansionStatus',
    'ExecutiveSummary', 'FunnelConversion', 'CohortMetrics', 'CustomerHealth',
    'RevenueAtRisk', 'ActionItem', 'SimulatorResult', 'LTVCACMetrics', 'WaterfallItem',
    'RepPerformance',
    # Database functions
    'get_connection', 'get_db', 'init_database', 'load_dataframe',
    'query_to_df', 'execute_query', 'get_table_count', 'table_exists',
    'get_database_stats', 'get_funnel_data', 'get_customer_health_data',
    'get_mrr_movements_summary', 'get_rep_performance',
    # Generator
    'SyntheticDataGenerator', 'generate_and_save',
]
