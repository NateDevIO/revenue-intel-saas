"""
Pydantic Models for Data Schema
===============================

Defines all data models for the SaaS Revenue Lifecycle Analyzer.
These models are used for:
- Data validation during generation
- API request/response serialization
- Database schema documentation
"""

from datetime import date, datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum


# =============================================================================
# ENUMS
# =============================================================================

class CompanySize(str, Enum):
    SMB = "SMB"
    MID_MARKET = "Mid-Market"
    ENTERPRISE = "Enterprise"


class LeadChannel(str, Enum):
    ORGANIC_SEARCH = "Organic Search"
    PAID_SEARCH = "Paid Search"
    CONTENT_MARKETING = "Content Marketing"
    REFERRAL = "Referral"
    EVENTS = "Events"
    OUTBOUND = "Outbound"
    PARTNER = "Partner"


class Industry(str, Enum):
    TECHNOLOGY = "Technology"
    FINANCIAL_SERVICES = "Financial Services"
    HEALTHCARE = "Healthcare"
    RETAIL = "Retail"
    MANUFACTURING = "Manufacturing"
    PROFESSIONAL_SERVICES = "Professional Services"
    OTHER = "Other"


class OpportunityStage(str, Enum):
    LEAD = "Lead"
    MQL = "MQL"
    SQL = "SQL"
    OPPORTUNITY = "Opportunity"
    NEGOTIATION = "Negotiation"
    CLOSED_WON = "Closed Won"
    CLOSED_LOST = "Closed Lost"


class CustomerStatus(str, Enum):
    ACTIVE = "Active"
    CHURNED = "Churned"


class HealthScore(str, Enum):
    GREEN = "Green"
    YELLOW = "Yellow"
    RED = "Red"


class MRRMovementType(str, Enum):
    NEW = "New"
    EXPANSION = "Expansion"
    CONTRACTION = "Contraction"
    CHURN = "Churn"
    REACTIVATION = "Reactivation"


class ExpansionStatus(str, Enum):
    IDENTIFIED = "Identified"
    IN_PROGRESS = "In Progress"
    WON = "Won"
    LOST = "Lost"


# =============================================================================
# CORE ENTITIES
# =============================================================================

class Lead(BaseModel):
    """Lead acquisition data."""
    model_config = ConfigDict(from_attributes=True)

    lead_id: str = Field(..., description="Unique lead identifier")
    created_date: date = Field(..., description="Date lead was created")
    channel: LeadChannel = Field(..., description="Acquisition channel")
    company_name: str = Field(..., description="Company name")
    company_size: CompanySize = Field(..., description="Company size segment")
    industry: Industry = Field(..., description="Industry vertical")
    estimated_acv: float = Field(..., ge=0, description="Estimated annual contract value")
    assigned_rep_id: Optional[str] = Field(None, description="Assigned sales rep ID")


class Opportunity(BaseModel):
    """Sales pipeline opportunity."""
    model_config = ConfigDict(from_attributes=True)

    opportunity_id: str = Field(..., description="Unique opportunity identifier")
    lead_id: str = Field(..., description="Source lead ID")
    created_date: date = Field(..., description="Date opportunity was created")
    current_stage: OpportunityStage = Field(..., description="Current pipeline stage")
    amount: float = Field(..., ge=0, description="Deal value (ACV)")
    close_date: Optional[date] = Field(None, description="Actual or expected close date")
    is_won: Optional[bool] = Field(None, description="Whether deal was won")
    loss_reason: Optional[str] = Field(None, description="Reason for loss if lost")
    assigned_rep_id: str = Field(..., description="Assigned sales rep ID")
    company_size: CompanySize = Field(..., description="Company size segment")
    channel: LeadChannel = Field(..., description="Original acquisition channel")
    industry: Industry = Field(..., description="Industry vertical")


class StageTransition(BaseModel):
    """Stage transition history for velocity analysis."""
    model_config = ConfigDict(from_attributes=True)

    transition_id: str = Field(..., description="Unique transition identifier")
    opportunity_id: str = Field(..., description="Related opportunity ID")
    from_stage: OpportunityStage = Field(..., description="Previous stage")
    to_stage: OpportunityStage = Field(..., description="New stage")
    transition_date: datetime = Field(..., description="When transition occurred")
    days_in_previous_stage: int = Field(..., ge=0, description="Days spent in previous stage")


class Customer(BaseModel):
    """Active or churned customer."""
    model_config = ConfigDict(from_attributes=True)

    customer_id: str = Field(..., description="Unique customer identifier")
    opportunity_id: str = Field(..., description="Source opportunity ID")
    company_name: str = Field(..., description="Company name")
    company_size: CompanySize = Field(..., description="Company size segment")
    industry: Industry = Field(..., description="Industry vertical")
    channel: LeadChannel = Field(..., description="Original acquisition channel")
    start_date: date = Field(..., description="Customer start date")
    status: CustomerStatus = Field(..., description="Current status")
    churn_date: Optional[date] = Field(None, description="Churn date if churned")
    current_mrr: float = Field(..., ge=0, description="Current monthly recurring revenue")
    initial_mrr: float = Field(..., ge=0, description="Initial MRR at start")
    assigned_rep_id: str = Field(..., description="Account owner rep ID")
    latest_nps_score: Optional[int] = Field(None, ge=0, le=10, description="Latest NPS score")
    health_score: Optional[HealthScore] = Field(None, description="Calculated health score")
    churn_probability: Optional[float] = Field(None, ge=0, le=1, description="Predicted churn probability")


class UsageEvent(BaseModel):
    """Daily product usage metrics."""
    model_config = ConfigDict(from_attributes=True)

    event_id: str = Field(..., description="Unique event identifier")
    customer_id: str = Field(..., description="Customer ID")
    event_date: date = Field(..., description="Date of usage")
    logins: int = Field(..., ge=0, description="Number of logins")
    api_calls: int = Field(..., ge=0, description="Number of API calls")
    reports_generated: int = Field(..., ge=0, description="Reports generated")
    team_members_active: int = Field(..., ge=0, description="Active team members")
    integrations_used: int = Field(..., ge=0, description="Integrations used")


class SalesRep(BaseModel):
    """Sales representative data."""
    model_config = ConfigDict(from_attributes=True)

    rep_id: str = Field(..., description="Unique rep identifier")
    name: str = Field(..., description="Rep name")
    start_date: date = Field(..., description="Employment start date")
    segment_focus: CompanySize = Field(..., description="Primary segment focus")
    performance_score: float = Field(..., ge=0, description="Performance multiplier")
    is_active: bool = Field(True, description="Whether currently active")


class MarketingSpend(BaseModel):
    """Marketing spend by channel and period."""
    model_config = ConfigDict(from_attributes=True)

    spend_id: str = Field(..., description="Unique spend record ID")
    channel: LeadChannel = Field(..., description="Marketing channel")
    period_start: date = Field(..., description="Period start date")
    period_end: date = Field(..., description="Period end date")
    amount: float = Field(..., ge=0, description="Spend amount")
    campaign_name: Optional[str] = Field(None, description="Campaign name if applicable")


class MRRMovement(BaseModel):
    """MRR movement tracking."""
    model_config = ConfigDict(from_attributes=True)

    movement_id: str = Field(..., description="Unique movement identifier")
    customer_id: str = Field(..., description="Customer ID")
    movement_date: date = Field(..., description="Date of movement")
    movement_type: MRRMovementType = Field(..., description="Type of MRR movement")
    amount: float = Field(..., description="Movement amount (can be negative)")
    previous_mrr: float = Field(..., ge=0, description="MRR before movement")
    new_mrr: float = Field(..., ge=0, description="MRR after movement")


class NPSSurvey(BaseModel):
    """NPS survey response."""
    model_config = ConfigDict(from_attributes=True)

    survey_id: str = Field(..., description="Unique survey identifier")
    customer_id: str = Field(..., description="Customer ID")
    survey_date: date = Field(..., description="Date survey was sent")
    score: Optional[int] = Field(None, ge=0, le=10, description="NPS score (0-10)")
    response_text: Optional[str] = Field(None, description="Open-ended response")
    responded: bool = Field(..., description="Whether customer responded")


class ExpansionOpportunity(BaseModel):
    """Upsell/cross-sell opportunity tracking."""
    model_config = ConfigDict(from_attributes=True)

    expansion_id: str = Field(..., description="Unique expansion opportunity ID")
    customer_id: str = Field(..., description="Customer ID")
    identified_date: date = Field(..., description="Date opportunity identified")
    opportunity_type: Literal["Upsell", "Cross-sell"] = Field(..., description="Type of expansion")
    estimated_value: float = Field(..., ge=0, description="Estimated expansion value")
    status: ExpansionStatus = Field(..., description="Current status")
    closed_date: Optional[date] = Field(None, description="Date closed if applicable")
    actual_value: Optional[float] = Field(None, ge=0, description="Actual value if won")


# =============================================================================
# API RESPONSE MODELS
# =============================================================================

class ExecutiveSummary(BaseModel):
    """Executive summary metrics."""
    total_pipeline_value: float
    pipeline_count: int
    overall_conversion_rate: float
    arr_at_risk: float
    total_arr: float
    ltv_cac_ratio: float
    net_revenue_retention: float
    monthly_churn_rate: float
    average_health_score: float
    critical_accounts_count: int


class FunnelConversion(BaseModel):
    """Funnel conversion metrics."""
    stage: str
    count: int
    conversion_rate: float
    dollar_value: float
    dollar_conversion_rate: float
    avg_days_in_stage: float


class CohortMetrics(BaseModel):
    """Cohort analysis metrics."""
    cohort: str
    leads: int
    conversions: int
    conversion_rate: float
    revenue: float
    avg_deal_size: float


class CustomerHealth(BaseModel):
    """Customer health summary."""
    customer_id: str
    company_name: str
    health_score: HealthScore
    churn_probability: float
    current_mrr: float
    tenure_days: int
    last_login_days: int
    usage_trend: float
    nps_score: Optional[int]
    top_churn_drivers: List[str]


class RevenueAtRisk(BaseModel):
    """Revenue at risk breakdown."""
    segment: str
    arr_at_risk: float
    customer_count: int
    avg_churn_probability: float
    top_risk_factors: List[str]


class ActionItem(BaseModel):
    """Prioritized action recommendation."""
    priority: int
    action: str
    expected_arr_impact: float
    confidence_low: float
    confidence_high: float
    effort: Literal["Low", "Medium", "High"]
    affected_customers: int
    rationale: str


class SimulatorResult(BaseModel):
    """What-if simulator result."""
    scenario_name: str
    current_arr: float
    projected_arr: float
    arr_impact: float
    confidence_interval_low: float
    confidence_interval_high: float
    assumptions: List[str]
    monte_carlo_distribution: List[float]


class LTVCACMetrics(BaseModel):
    """LTV:CAC metrics by segment."""
    segment: str
    ltv: float
    cac: float
    ltv_cac_ratio: float
    payback_months: float
    customer_count: int


class WaterfallItem(BaseModel):
    """Revenue waterfall item."""
    category: str
    amount: float
    is_positive: bool
    running_total: float


class RepPerformance(BaseModel):
    """Sales rep performance metrics."""
    rep_id: str
    rep_name: str
    segment: str
    opportunities_worked: int
    deals_won: int
    win_rate: float
    total_revenue: float
    avg_deal_size: float
    avg_sales_cycle_days: float
    performance_vs_baseline: float
