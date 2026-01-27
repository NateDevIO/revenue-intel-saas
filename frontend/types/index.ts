// ============================================================================
// Executive Summary Types
// ============================================================================

export interface ExecutiveSummary {
  pipeline: {
    total_value: number;
    total_count: number;
    conversion_rate: number;
    won_value: number;
  };
  revenue: {
    current_arr: number;
    current_mrr: number;
    nrr: number;
    ltv_cac_ratio: number;
  };
  customers: {
    total_active: number;
    avg_mrr: number;
    health_distribution: HealthDistribution;
  };
  risk: {
    arr_at_risk: number;
    churn_rate: number;
    critical_accounts: number;
  };
  period: {
    new_mrr_12m: number;
    expansion_mrr_12m: number;
    contraction_mrr_12m: number;
    churn_mrr_12m: number;
  };
}

// ============================================================================
// Funnel Types
// ============================================================================

export interface FunnelSummary {
  total_opportunities: number;
  total_pipeline_value: number;
  closed_won_count: number;
  closed_won_value: number;
  overall_conversion_rate: number;
  dollar_conversion_rate: number;
  stages: StageData[];
}

export interface StageData {
  current_stage: string;
  count: number;
  total_value: number;
  avg_value: number;
}

export interface ConversionRate {
  from_stage: string;
  to_stage: string;
  from_count: number;
  to_count: number;
  conversion_rate: number;
  from_value: number;
  to_value: number;
  dollar_conversion_rate: number;
}

export interface VelocityMetrics {
  from_stage: string;
  to_stage: string;
  median_days: number;
  p75_days: number;
  avg_days: number;
  count: number;
  has_slow_deals: boolean;
}

export interface CohortData {
  cohort: string;
  leads: number;
  conversions: number;
  conversion_rate: number;
  revenue: number;
  avg_deal_size: number;
}

export interface LossReason {
  stage: string;
  reason: string;
  count: number;
  percentage: number;
  lost_value: number;
  value_percentage: number;
  avg_deal_size: number;
}

export interface RepPerformance {
  rep_id: string;
  name: string;
  segment: string;
  opportunities_worked: number;
  deals_won: number;
  deals_lost: number;
  win_rate: number;
  total_revenue: number;
  avg_deal_size: number;
  avg_cycle_days: number;
  performance_vs_team: number;
  revenue_vs_team: number;
  baseline_score: number;
}

// ============================================================================
// Customer Types
// ============================================================================

export interface Customer {
  customer_id: string;
  company_name: string;
  company_size: "SMB" | "Mid-Market" | "Enterprise";
  industry: string;
  channel: string;
  status: "Active" | "Churned";
  start_date: string;
  churn_date: string | null;
  current_mrr: number;
  arr: number;
  initial_mrr: number;
  health_score: "Green" | "Yellow" | "Red" | null;
  churn_probability: number | null;
  nps_score: number | null;
  tenure_days: number;
}

export interface CustomerDetail extends Customer {
  health_breakdown: HealthBreakdown;
  churn_drivers: ChurnDriver[];
  usage_summary: UsageSummary;
  mrr_history: MRRMovement[];
  recommendations: string[];
}

export interface HealthBreakdown {
  usage: HealthComponent;
  engagement: HealthComponent;
  sentiment: HealthComponent;
  financial: HealthComponent;
}

export interface HealthComponent {
  score: number;
  weight: number;
  factors: HealthFactor[];
}

export interface HealthFactor {
  metric: string;
  value: string | number;
  benchmark?: number;
  status: string;
}

export interface HealthDistribution {
  Green: { count: number; mrr: number; percentage?: number };
  Yellow: { count: number; mrr: number; percentage?: number };
  Red: { count: number; mrr: number; percentage?: number };
}

export interface UsageSummary {
  avg_logins_30d: number;
  avg_api_calls_30d: number;
  last_active: string | null;
}

// ============================================================================
// Churn Types
// ============================================================================

export interface ChurnSummary {
  total_customers: number;
  active_customers: number;
  churned_customers: number;
  churn_rate: number;
  active_mrr: number;
  churned_mrr: number;
  avg_churn_probability: number;
  arr_at_risk: number;
}

export interface ChurnPrediction {
  customer_id: string;
  company_name: string;
  company_size: string;
  industry: string;
  current_mrr: number;
  arr: number;
  tenure_days: number;
  churn_probability: number;
  health_score: string;
  nps_score: number | null;
  arr_at_risk: number;
}

export interface ChurnDriver {
  factor: string;
  impact?: string;
  value?: string | number;
  importance?: number;
  direction?: string;
  recommendation?: string;
}

export interface AtRiskCustomer extends ChurnPrediction {
  recommended_action: string;
}

// ============================================================================
// Revenue Types
// ============================================================================

export interface RevenueSummary {
  current_mrr: number;
  current_arr: number;
  active_customers: number;
  avg_mrr_per_customer: number;
  nrr: number;
  new_mrr_12m: number;
  expansion_mrr_12m: number;
  contraction_mrr_12m: number;
  churn_mrr_12m: number;
  ltv_cac_ratio: number;
  avg_payback_months: number;
}

export interface LTVCACMetrics {
  segment: string;
  ltv: number;
  cac: number;
  ltv_cac_ratio: number;
  payback_months: number;
  avg_mrr: number;
  avg_lifetime_months: number;
  customer_count: number;
}

export interface WaterfallItem {
  category: string;
  amount: number;
  is_positive?: boolean;
  is_total?: boolean;
  running_total: number;
}

export interface RevenueAtRisk {
  total_arr: number;
  total_arr_at_risk: number;
  risk_percentage: number;
  by_segment: SegmentRisk[];
}

export interface SegmentRisk {
  segment: string;
  arr: number;
  arr_at_risk: number;
  customer_count: number;
  avg_churn_probability: number;
  percentage_of_total_risk: number;
}

export interface MRRMovement {
  movement_date: string;
  movement_type: "New" | "Expansion" | "Contraction" | "Churn" | "Reactivation";
  amount: number;
  new_mrr: number;
}

// ============================================================================
// Action Types
// ============================================================================

export interface ActionItem {
  priority: number;
  action: string;
  category?: string;
  expected_arr_impact: number;
  confidence_low: number;
  confidence_high: number;
  effort: "Low" | "Medium" | "High";
  affected_customers: number;
  rationale: string;
}

// ============================================================================
// Simulator Types
// ============================================================================

export interface WhatIfScenario {
  name: string;
  churn_reduction?: number;
  conversion_improvement?: number;
  expansion_increase?: number;
  price_increase?: number;
  lead_volume_increase?: number;
}

export interface SimulatorResult {
  scenario_name: string;
  current_arr: number;
  projected_arr_mean: number;
  projected_arr_median: number;
  arr_impact_mean: number;
  confidence_interval_10: number;
  confidence_interval_90: number;
  confidence_interval_25: number;
  confidence_interval_75: number;
  distribution: number[];
  iterations: number;
  parameters: WhatIfScenario;
}

export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  parameters: WhatIfScenario;
}

// ============================================================================
// Benchmark Types
// ============================================================================

export interface BenchmarkMetric {
  our_value: number;
  benchmark_median: number;
  benchmark_top_quartile: number;
  benchmark_bottom_quartile: number;
  rating: "Excellent" | "Good" | "Fair" | "Needs Improvement";
}

export interface Benchmarks {
  nrr: BenchmarkMetric;
  ltv_cac_ratio: BenchmarkMetric;
  payback_months: BenchmarkMetric;
  monthly_churn_rate: BenchmarkMetric;
}

// ============================================================================
// Page AI Insight Types
// ============================================================================

export interface PageInsightResponse {
  page_id: string;
  insight: string;
  model: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface CustomerListResponse {
  customers: Customer[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}
