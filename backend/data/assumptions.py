"""
Data Generation Assumptions
===========================

This module documents all assumptions used in the synthetic data generation.
These parameters can be adjusted to simulate different business scenarios.

All assumptions are based on typical B2B SaaS benchmarks and are designed to
create realistic patterns including:
- Seasonality
- Segment-based variation
- Usage-churn correlation
- Rep performance variation
"""

from dataclasses import dataclass, field
from typing import Dict, List
from datetime import date
from enum import Enum


# =============================================================================
# ENUMS FOR TYPE SAFETY
# =============================================================================

class CompanySize(str, Enum):
    """Company size segments."""
    SMB = "SMB"
    MID_MARKET = "Mid-Market"
    ENTERPRISE = "Enterprise"


class LeadChannel(str, Enum):
    """Lead acquisition channels."""
    ORGANIC_SEARCH = "Organic Search"
    PAID_SEARCH = "Paid Search"
    CONTENT_MARKETING = "Content Marketing"
    REFERRAL = "Referral"
    EVENTS = "Events"
    OUTBOUND = "Outbound"
    PARTNER = "Partner"


class Industry(str, Enum):
    """Industry verticals."""
    TECHNOLOGY = "Technology"
    FINANCIAL_SERVICES = "Financial Services"
    HEALTHCARE = "Healthcare"
    RETAIL = "Retail"
    MANUFACTURING = "Manufacturing"
    PROFESSIONAL_SERVICES = "Professional Services"
    OTHER = "Other"


class OpportunityStage(str, Enum):
    """Sales pipeline stages."""
    LEAD = "Lead"
    MQL = "MQL"
    SQL = "SQL"
    OPPORTUNITY = "Opportunity"
    NEGOTIATION = "Negotiation"
    CLOSED_WON = "Closed Won"
    CLOSED_LOST = "Closed Lost"


class CustomerStatus(str, Enum):
    """Customer status values."""
    ACTIVE = "Active"
    CHURNED = "Churned"


class MRRMovementType(str, Enum):
    """MRR movement types."""
    NEW = "New"
    EXPANSION = "Expansion"
    CONTRACTION = "Contraction"
    CHURN = "Churn"
    REACTIVATION = "Reactivation"

# =============================================================================
# TIME PARAMETERS
# =============================================================================

DATA_START_DATE = date(2023, 1, 1)
DATA_END_DATE = date(2024, 12, 31)
MONTHS_OF_DATA = 24

# =============================================================================
# LEAD GENERATION ASSUMPTIONS
# =============================================================================

@dataclass
class LeadGenAssumptions:
    """Lead generation parameters by channel and segment."""

    # Monthly lead volume (base, before seasonality)
    base_leads_per_month: int = 750

    # Seasonality multipliers by month (1 = January, 12 = December)
    seasonality: Dict[int, float] = field(default_factory=lambda: {
        1: 0.85,   # January - post-holiday slowdown
        2: 0.95,   # February - ramping up
        3: 1.10,   # March - Q1 push
        4: 1.05,   # April
        5: 1.00,   # May
        6: 0.95,   # June - Q2 end
        7: 0.80,   # July - summer slowdown
        8: 0.80,   # August - summer slowdown
        9: 1.15,   # September - back to business
        10: 1.15,  # October
        11: 1.10,  # November
        12: 0.85,  # December - holiday slowdown
    })

    # Channel distribution (must sum to 1.0)
    channel_distribution: Dict[str, float] = field(default_factory=lambda: {
        'Organic Search': 0.25,
        'Paid Search': 0.20,
        'Content Marketing': 0.15,
        'Referral': 0.12,
        'Events': 0.10,
        'Outbound': 0.10,
        'Partner': 0.08,
    })

    # Company size distribution (must sum to 1.0)
    company_size_distribution: Dict[str, float] = field(default_factory=lambda: {
        'SMB': 0.50,        # 1-50 employees
        'Mid-Market': 0.35,  # 51-500 employees
        'Enterprise': 0.15,  # 500+ employees
    })

    # Industry distribution (must sum to 1.0)
    industry_distribution: Dict[str, float] = field(default_factory=lambda: {
        'Technology': 0.30,
        'Financial Services': 0.18,
        'Healthcare': 0.15,
        'Retail': 0.12,
        'Manufacturing': 0.10,
        'Professional Services': 0.10,
        'Other': 0.05,
    })


# =============================================================================
# CONVERSION RATE ASSUMPTIONS
# =============================================================================

@dataclass
class ConversionAssumptions:
    """Conversion rates by stage and segment."""

    # Base conversion rates by stage
    # Stage: Lead -> MQL -> SQL -> Opportunity -> Negotiation -> Closed Won
    base_stage_conversion: Dict[str, float] = field(default_factory=lambda: {
        'lead_to_mql': 0.40,
        'mql_to_sql': 0.50,
        'sql_to_opportunity': 0.60,
        'opportunity_to_negotiation': 0.50,
        'negotiation_to_closed': 0.65,
    })

    # Segment multipliers (applied to base conversion rates)
    segment_multipliers: Dict[str, Dict[str, float]] = field(default_factory=lambda: {
        'SMB': {
            'lead_to_mql': 1.15,       # Higher initial conversion
            'mql_to_sql': 1.10,
            'sql_to_opportunity': 1.05,
            'opportunity_to_negotiation': 0.90,  # Lower at later stages
            'negotiation_to_closed': 0.85,
        },
        'Mid-Market': {
            'lead_to_mql': 1.00,
            'mql_to_sql': 1.00,
            'sql_to_opportunity': 1.00,
            'opportunity_to_negotiation': 1.00,
            'negotiation_to_closed': 1.00,
        },
        'Enterprise': {
            'lead_to_mql': 0.80,       # Lower initial conversion
            'mql_to_sql': 0.85,
            'sql_to_opportunity': 0.90,
            'opportunity_to_negotiation': 1.15,  # Higher at later stages
            'negotiation_to_closed': 1.20,
        },
    })

    # Channel quality multipliers
    channel_quality: Dict[str, float] = field(default_factory=lambda: {
        'Organic Search': 1.10,      # High intent
        'Paid Search': 0.95,
        'Content Marketing': 1.05,
        'Referral': 1.25,            # Best quality
        'Events': 1.00,
        'Outbound': 0.80,            # Lower conversion
        'Partner': 1.15,
    })

    # Loss reasons by stage (probabilities must sum to 1.0 per stage)
    loss_reasons: Dict[str, Dict[str, float]] = field(default_factory=lambda: {
        'mql': {
            'No Response': 0.35,
            'Not Qualified': 0.30,
            'Bad Timing': 0.20,
            'Competitor': 0.10,
            'Other': 0.05,
        },
        'sql': {
            'Budget': 0.30,
            'No Authority': 0.25,
            'Bad Timing': 0.20,
            'Competitor': 0.15,
            'Other': 0.10,
        },
        'opportunity': {
            'Budget': 0.35,
            'Competitor': 0.25,
            'No Decision': 0.20,
            'Requirements Not Met': 0.15,
            'Other': 0.05,
        },
        'negotiation': {
            'Price': 0.35,
            'Competitor': 0.30,
            'Contract Terms': 0.15,
            'Internal Politics': 0.12,
            'Other': 0.08,
        },
    })


# =============================================================================
# SALES VELOCITY ASSUMPTIONS
# =============================================================================

@dataclass
class VelocityAssumptions:
    """Time-to-stage parameters in days."""

    # Median days in each stage
    median_stage_days: Dict[str, int] = field(default_factory=lambda: {
        'lead_to_mql': 7,
        'mql_to_sql': 14,
        'sql_to_opportunity': 21,
        'opportunity_to_negotiation': 30,
        'negotiation_to_closed': 21,
    })

    # Segment multipliers for velocity (higher = slower)
    segment_velocity_multipliers: Dict[str, float] = field(default_factory=lambda: {
        'SMB': 0.70,        # Faster cycles
        'Mid-Market': 1.00,
        'Enterprise': 1.80,  # Much longer cycles
    })

    # Coefficient of variation (for generating realistic spread)
    cv: float = 0.50


# =============================================================================
# DEAL VALUE ASSUMPTIONS
# =============================================================================

@dataclass
class DealValueAssumptions:
    """Annual contract value assumptions by segment."""

    # ACV ranges by segment (min, median, max)
    acv_by_segment: Dict[str, Dict[str, int]] = field(default_factory=lambda: {
        'SMB': {'min': 6000, 'median': 12000, 'max': 24000},
        'Mid-Market': {'min': 24000, 'median': 48000, 'max': 120000},
        'Enterprise': {'min': 100000, 'median': 180000, 'max': 500000},
    })


# =============================================================================
# SALES REP ASSUMPTIONS
# =============================================================================

@dataclass
class SalesRepAssumptions:
    """Sales rep performance parameters."""

    # Number of reps
    num_reps: int = 12

    # Rep performance distribution (relative to baseline)
    # Performance follows a normal distribution with this std dev
    performance_std_dev: float = 0.20  # ±20%

    # Minimum and maximum performance bounds
    min_performance: float = 0.60
    max_performance: float = 1.40

    # Rep territories (segment assignments)
    rep_segment_focus: List[str] = field(default_factory=lambda: [
        'SMB', 'SMB', 'SMB', 'SMB',
        'Mid-Market', 'Mid-Market', 'Mid-Market', 'Mid-Market',
        'Enterprise', 'Enterprise', 'Enterprise', 'Enterprise',
    ])


# =============================================================================
# CUSTOMER RETENTION ASSUMPTIONS
# =============================================================================

@dataclass
class RetentionAssumptions:
    """Customer retention and churn parameters."""

    # Base monthly churn rate (before adjustments)
    base_monthly_churn: float = 0.025  # 2.5% monthly = ~30% annual

    # Churn rate by segment
    segment_churn_multipliers: Dict[str, float] = field(default_factory=lambda: {
        'SMB': 1.40,        # Higher churn
        'Mid-Market': 1.00,
        'Enterprise': 0.50,  # Much stickier
    })

    # Usage-churn correlation parameters
    # Churn probability = base * (1 + usage_churn_sensitivity * (1 - usage_percentile))
    usage_churn_sensitivity: float = 1.5

    # Support tickets impact on churn
    # Each unresolved ticket increases churn probability by this factor
    ticket_churn_multiplier: float = 0.05

    # NPS-churn relationship
    # Detractors (0-6) churn multiplier
    nps_detractor_multiplier: float = 2.0
    # Passives (7-8) churn multiplier
    nps_passive_multiplier: float = 1.0
    # Promoters (9-10) churn multiplier
    nps_promoter_multiplier: float = 0.5


# =============================================================================
# USAGE PATTERNS ASSUMPTIONS
# =============================================================================

@dataclass
class UsageAssumptions:
    """Product usage pattern parameters."""

    # Usage metrics tracked daily
    metrics: List[str] = field(default_factory=lambda: [
        'logins',
        'api_calls',
        'reports_generated',
        'team_members_active',
        'integrations_used',
    ])

    # Base daily usage by segment (median values)
    base_usage_by_segment: Dict[str, Dict[str, float]] = field(default_factory=lambda: {
        'SMB': {
            'logins': 5,
            'api_calls': 100,
            'reports_generated': 3,
            'team_members_active': 3,
            'integrations_used': 1,
        },
        'Mid-Market': {
            'logins': 15,
            'api_calls': 500,
            'reports_generated': 10,
            'team_members_active': 10,
            'integrations_used': 3,
        },
        'Enterprise': {
            'logins': 50,
            'api_calls': 2000,
            'reports_generated': 30,
            'team_members_active': 30,
            'integrations_used': 5,
        },
    })

    # Usage decline pattern for churning customers
    # Days before churn when decline starts
    decline_start_days: int = 60
    # Final usage as percentage of normal
    decline_final_percentage: float = 0.20


# =============================================================================
# EXPANSION REVENUE ASSUMPTIONS
# =============================================================================

@dataclass
class ExpansionAssumptions:
    """Upsell and expansion revenue parameters."""

    # Monthly probability of expansion opportunity arising
    monthly_expansion_probability: float = 0.08

    # Expansion amount as percentage of current MRR
    expansion_percentage_range: Dict[str, float] = field(default_factory=lambda: {
        'min': 0.10,
        'median': 0.25,
        'max': 0.50,
    })

    # Expansion conversion rate (from opportunity to closed)
    expansion_conversion_rate: float = 0.40

    # Contraction parameters
    monthly_contraction_probability: float = 0.02
    contraction_percentage_range: Dict[str, float] = field(default_factory=lambda: {
        'min': 0.10,
        'median': 0.20,
        'max': 0.40,
    })


# =============================================================================
# MARKETING SPEND ASSUMPTIONS
# =============================================================================

@dataclass
class MarketingAssumptions:
    """Marketing spend and CAC parameters."""

    # Monthly spend by channel
    monthly_spend_by_channel: Dict[str, int] = field(default_factory=lambda: {
        'Organic Search': 15000,     # SEO, content team
        'Paid Search': 40000,        # Google/Bing ads
        'Content Marketing': 20000,  # Content production
        'Referral': 10000,           # Referral program costs
        'Events': 25000,             # Events/webinars
        'Outbound': 35000,           # SDR team
        'Partner': 15000,            # Partner program
    })

    # Spend variation (coefficient of variation)
    spend_cv: float = 0.15


# =============================================================================
# NPS ASSUMPTIONS
# =============================================================================

@dataclass
class NPSAssumptions:
    """NPS survey parameters."""

    # Survey frequency (days between surveys)
    survey_frequency_days: int = 90

    # Response rate
    response_rate: float = 0.35

    # NPS distribution by customer health
    # Format: (promoter_prob, passive_prob, detractor_prob)
    score_distribution_by_health: Dict[str, tuple] = field(default_factory=lambda: {
        'healthy': (0.60, 0.30, 0.10),
        'at_risk': (0.20, 0.40, 0.40),
        'churning': (0.05, 0.25, 0.70),
    })


# =============================================================================
# COMBINED ASSUMPTIONS INSTANCE
# =============================================================================

@dataclass
class AllAssumptions:
    """Container for all assumption categories."""

    lead_gen: LeadGenAssumptions = field(default_factory=LeadGenAssumptions)
    conversion: ConversionAssumptions = field(default_factory=ConversionAssumptions)
    velocity: VelocityAssumptions = field(default_factory=VelocityAssumptions)
    deal_value: DealValueAssumptions = field(default_factory=DealValueAssumptions)
    sales_rep: SalesRepAssumptions = field(default_factory=SalesRepAssumptions)
    retention: RetentionAssumptions = field(default_factory=RetentionAssumptions)
    usage: UsageAssumptions = field(default_factory=UsageAssumptions)
    expansion: ExpansionAssumptions = field(default_factory=ExpansionAssumptions)
    marketing: MarketingAssumptions = field(default_factory=MarketingAssumptions)
    nps: NPSAssumptions = field(default_factory=NPSAssumptions)


# Default assumptions instance
DEFAULT_ASSUMPTIONS = AllAssumptions()


def get_assumptions() -> AllAssumptions:
    """Get the default assumptions instance."""
    return DEFAULT_ASSUMPTIONS


def print_assumptions_summary():
    """Print a summary of key assumptions for documentation."""
    a = DEFAULT_ASSUMPTIONS

    print("=" * 60)
    print("SYNTHETIC DATA GENERATION ASSUMPTIONS")
    print("=" * 60)

    print("\n📊 LEAD GENERATION")
    print(f"  Base leads/month: {a.lead_gen.base_leads_per_month}")
    print(f"  Channels: {list(a.lead_gen.channel_distribution.keys())}")
    print(f"  Segments: {list(a.lead_gen.company_size_distribution.keys())}")

    print("\n📈 CONVERSION RATES (Base)")
    for stage, rate in a.conversion.base_stage_conversion.items():
        print(f"  {stage}: {rate:.0%}")

    print("\n⏱️ SALES VELOCITY (Median Days)")
    for stage, days in a.velocity.median_stage_days.items():
        print(f"  {stage}: {days} days")

    print("\n💰 DEAL VALUES (ACV)")
    for segment, values in a.deal_value.acv_by_segment.items():
        print(f"  {segment}: ${values['min']:,} - ${values['max']:,} (median: ${values['median']:,})")

    print("\n🔄 RETENTION")
    print(f"  Base monthly churn: {a.retention.base_monthly_churn:.1%}")
    print(f"  Usage-churn sensitivity: {a.retention.usage_churn_sensitivity}")

    print("\n📢 MARKETING SPEND")
    total = sum(a.marketing.monthly_spend_by_channel.values())
    print(f"  Total monthly: ${total:,}")

    print("=" * 60)


if __name__ == "__main__":
    print_assumptions_summary()
