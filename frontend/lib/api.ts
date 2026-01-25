/**
 * API Client
 *
 * Provides typed API functions for the SaaS Revenue Lifecycle Analyzer.
 */

import type {
  ExecutiveSummary,
  FunnelSummary,
  ConversionRate,
  VelocityMetrics,
  CohortData,
  LossReason,
  RepPerformance,
  Customer,
  CustomerDetail,
  CustomerListResponse,
  ChurnSummary,
  ChurnPrediction,
  ChurnDriver,
  AtRiskCustomer,
  RevenueSummary,
  LTVCACMetrics,
  WaterfallItem,
  RevenueAtRisk,
  ActionItem,
  WhatIfScenario,
  SimulatorResult,
  ScenarioPreset,
  Benchmarks,
  HealthDistribution,
} from "@/types";

const API_BASE = "/api";

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API Error: ${res.status}`);
  }

  return res.json();
}

// ============================================================================
// Executive Summary
// ============================================================================

export async function getExecutiveSummary(): Promise<ExecutiveSummary> {
  return fetchAPI<ExecutiveSummary>("/summary");
}

export async function getPrioritizedActions(): Promise<{
  recommendations: ActionItem[];
  total_potential_impact: number;
}> {
  return fetchAPI("/actions");
}

export async function getBenchmarks(): Promise<Benchmarks> {
  return fetchAPI<Benchmarks>("/benchmarks");
}

// ============================================================================
// Funnel Analytics
// ============================================================================

export async function getFunnelSummary(
  startDate?: string,
  endDate?: string
): Promise<FunnelSummary> {
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  const query = params.toString() ? `?${params.toString()}` : "";
  return fetchAPI<FunnelSummary>(`/funnel/summary${query}`);
}

export async function getConversionRates(
  startDate?: string,
  endDate?: string
): Promise<ConversionRate[]> {
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  const query = params.toString() ? `?${params.toString()}` : "";
  return fetchAPI<ConversionRate[]>(`/funnel/conversion${query}`);
}

export async function getFunnelBySegment(
  segment: string = "company_size",
  startDate?: string,
  endDate?: string
): Promise<any[]> {
  const params = new URLSearchParams({ segment });
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  return fetchAPI(`/funnel/by-segment?${params.toString()}`);
}

export async function getVelocityMetrics(
  startDate?: string,
  endDate?: string,
  companySize?: string
): Promise<VelocityMetrics[]> {
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  if (companySize) params.append("company_size", companySize);
  const query = params.toString() ? `?${params.toString()}` : "";
  return fetchAPI<VelocityMetrics[]>(`/funnel/velocity${query}`);
}

export async function getCohortAnalysis(
  period: "week" | "month" = "month",
  startDate?: string,
  endDate?: string
): Promise<CohortData[]> {
  const params = new URLSearchParams({ period });
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  return fetchAPI<CohortData[]>(`/funnel/cohorts?${params.toString()}`);
}

export async function getLossReasons(
  startDate?: string,
  endDate?: string
): Promise<LossReason[]> {
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  const query = params.toString() ? `?${params.toString()}` : "";
  return fetchAPI<LossReason[]>(`/funnel/loss-reasons${query}`);
}

export async function getRepPerformance(
  startDate?: string,
  endDate?: string
): Promise<RepPerformance[]> {
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  const query = params.toString() ? `?${params.toString()}` : "";
  return fetchAPI<RepPerformance[]>(`/funnel/rep-performance${query}`);
}

// ============================================================================
// Customer Analytics
// ============================================================================

export async function getCustomers(params: {
  status?: string;
  health?: string;
  company_size?: string;
  sort_by?: string;
  sort_order?: string;
  limit?: number;
  offset?: number;
}): Promise<CustomerListResponse> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) searchParams.append(key, String(value));
  });
  return fetchAPI<CustomerListResponse>(`/customers?${searchParams.toString()}`);
}

export async function getCustomerDetail(
  customerId: string
): Promise<CustomerDetail> {
  return fetchAPI<CustomerDetail>(`/customers/${customerId}`);
}

export async function getCustomerSegments(): Promise<{
  by_company_size: any[];
  by_industry: any[];
}> {
  return fetchAPI("/customers/segments");
}

export async function getHealthDistribution(): Promise<{
  distribution: HealthDistribution;
  total_customers: number;
  total_mrr: number;
}> {
  return fetchAPI("/customers/health-distribution");
}

export async function getCustomersByHealth(
  healthCategory: string,
  limit: number = 50
): Promise<Customer[]> {
  return fetchAPI<Customer[]>(
    `/customers/by-health/${healthCategory}?limit=${limit}`
  );
}

// ============================================================================
// Churn Analytics
// ============================================================================

export async function getChurnSummary(): Promise<ChurnSummary> {
  return fetchAPI<ChurnSummary>("/churn/summary");
}

export async function getChurnBySegment(
  segment: string = "company_size"
): Promise<any[]> {
  return fetchAPI(`/churn/by-segment?segment=${segment}`);
}

export async function getChurnPredictions(
  minProbability: number = 0,
  limit: number = 100
): Promise<ChurnPrediction[]> {
  return fetchAPI<ChurnPrediction[]>(
    `/churn/predictions?min_probability=${minProbability}&limit=${limit}`
  );
}

export async function getCustomerChurnPrediction(
  customerId: string
): Promise<{
  customer_id: string;
  churn_probability: number;
  risk_level: string;
  confidence: string;
  explanation: any[];
  top_risk_factors: string[];
  recommended_action: string;
}> {
  return fetchAPI(`/churn/predictions/${customerId}`);
}

export async function getChurnDrivers(
  customerId?: string
): Promise<ChurnDriver[]> {
  const query = customerId ? `?customer_id=${customerId}` : "";
  return fetchAPI<ChurnDriver[]>(`/churn/drivers${query}`);
}

export async function getAtRiskCustomers(
  threshold: number = 0.5,
  minMrr: number = 0
): Promise<AtRiskCustomer[]> {
  return fetchAPI<AtRiskCustomer[]>(
    `/churn/at-risk?threshold=${threshold}&min_mrr=${minMrr}`
  );
}

export async function getInterventionRecommendations(
  budget: number = 50000
): Promise<{
  recommendations: any[];
  summary: any;
}> {
  return fetchAPI(`/churn/interventions?budget=${budget}`);
}

// ============================================================================
// Revenue Analytics
// ============================================================================

export async function getRevenueSummary(): Promise<RevenueSummary> {
  return fetchAPI<RevenueSummary>("/revenue/summary");
}

export async function getLTVCACMetrics(): Promise<{
  overall_ltv: number;
  overall_cac: number;
  overall_ltv_cac: number;
  avg_payback_months: number;
  by_segment: LTVCACMetrics[];
}> {
  return fetchAPI("/revenue/ltv-cac");
}

export async function getNRRTrend(
  periods: number = 12
): Promise<{
  current_nrr: number;
  trend: { period: string; nrr: number }[];
}> {
  return fetchAPI(`/revenue/nrr?periods=${periods}`);
}

export async function getMRRWaterfall(
  startDate?: string,
  endDate?: string
): Promise<WaterfallItem[]> {
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  const query = params.toString() ? `?${params.toString()}` : "";
  return fetchAPI<WaterfallItem[]>(`/revenue/waterfall${query}`);
}

export async function getRevenueAtRisk(): Promise<RevenueAtRisk> {
  return fetchAPI<RevenueAtRisk>("/revenue/at-risk");
}

export async function getRevenueLeakage(): Promise<
  {
    source: string;
    amount: number;
    description: string;
    actionable: boolean;
    recommendation: string;
  }[]
> {
  return fetchAPI("/revenue/leakage");
}

export async function getRevenueActions(): Promise<ActionItem[]> {
  return fetchAPI<ActionItem[]>("/revenue/actions");
}

// ============================================================================
// Simulator
// ============================================================================

export async function runWhatIfScenario(
  scenario: WhatIfScenario
): Promise<SimulatorResult> {
  return fetchAPI<SimulatorResult>("/simulator/what-if", {
    method: "POST",
    body: JSON.stringify(scenario),
  });
}

export async function getScenarioPresets(): Promise<ScenarioPreset[]> {
  return fetchAPI<ScenarioPreset[]>("/simulator/presets");
}

export async function runPresetScenario(
  presetId: string
): Promise<SimulatorResult> {
  return fetchAPI<SimulatorResult>(`/simulator/presets/${presetId}/run`);
}

export async function runSensitivityAnalysis(
  variable: string,
  minValue: number = 0,
  maxValue: number = 0.3,
  steps: number = 10
): Promise<{
  variable: string;
  results: {
    value: number;
    arr_impact: number;
    confidence_low: number;
    confidence_high: number;
  }[];
  current_arr: number;
}> {
  return fetchAPI(
    `/simulator/sensitivity?variable=${variable}&min_value=${minValue}&max_value=${maxValue}&steps=${steps}`
  );
}

export async function compareScenarios(
  scenarioIds: string[]
): Promise<{
  current_arr: number;
  scenarios: any[];
  best_scenario: any;
}> {
  return fetchAPI(`/simulator/compare?scenario_ids=${scenarioIds.join(",")}`);
}
