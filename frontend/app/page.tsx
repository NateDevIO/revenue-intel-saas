"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  Users,
  TrendingUp,
  AlertTriangle,
  Target,
  ArrowRight,
  Info,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { KPICard } from "@/components/layout/kpi-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getExecutiveSummary,
  getPrioritizedActions,
  getMRRWaterfall,
} from "@/lib/api";
import { formatCurrency, formatPercent, getHealthColor } from "@/lib/utils";
import type { ExecutiveSummary, ActionItem, WaterfallItem } from "@/types";
import Link from "next/link";
import { MRRWaterfallChart, HealthScorePieChart } from "@/components/charts";
import { FadeIn, StaggerChildren, StaggerItem } from "@/components/ui/fade-in";
import { ExportShareMenu } from "@/components/export-share-menu";
import { PageInsights } from "@/components/ai/page-insights";

type MetricDialog = "arr" | "nrr" | "risk" | "ltv" | "action" | null;

export default function DashboardPage() {
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [waterfall, setWaterfall] = useState<WaterfallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<MetricDialog>(null);
  const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [summaryData, actionsData, waterfallData] = await Promise.all([
          getExecutiveSummary(),
          getPrioritizedActions(),
          getMRRWaterfall(),
        ]);
        setSummary(summaryData);
        setActions(actionsData.recommendations);
        setWaterfall(waterfallData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold">Failed to load dashboard</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!summary) return null;

  const healthDist = summary.customers.health_distribution;

  return (
    <div className="space-y-6" id="dashboard-content">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Executive Summary</h1>
            <p className="text-muted-foreground">
              Revenue intelligence dashboard - What should you do Monday morning?
            </p>
          </div>
          <ExportShareMenu
            exportElementId="dashboard-content"
            exportTitle="Executive Summary Dashboard"
            filename="executive-summary"
          />
        </div>
      </FadeIn>

      {/* KPI Cards */}
      <StaggerChildren className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <KPICard
            title="Current ARR"
            value={formatCurrency(summary.revenue.current_arr, { compact: true })}
            subtitle={`${summary.customers.total_active} active customers`}
            icon={<DollarSign className="h-4 w-4" />}
            clickable
            onClick={() => setOpenDialog("arr")}
          />
        </StaggerItem>
        <StaggerItem>
          <KPICard
            title="Net Revenue Retention"
            value={formatPercent(summary.revenue.nrr)}
            subtitle={summary.revenue.nrr >= 1 ? "Healthy" : "Needs attention"}
            valueClassName={
              summary.revenue.nrr >= 1 ? "text-green-600" : "text-red-600"
            }
            icon={<TrendingUp className="h-4 w-4" />}
            clickable
            onClick={() => setOpenDialog("nrr")}
          />
        </StaggerItem>
        <StaggerItem>
          <KPICard
            title="ARR at Risk"
            value={formatCurrency(summary.risk.arr_at_risk, { compact: true })}
            subtitle={`${formatPercent(summary.risk.churn_rate)} churn rate`}
            valueClassName="text-red-600"
            icon={<AlertTriangle className="h-4 w-4" />}
            clickable
            onClick={() => setOpenDialog("risk")}
          />
        </StaggerItem>
        <StaggerItem>
          <KPICard
            title="LTV:CAC Ratio"
            value={`${summary.revenue.ltv_cac_ratio.toFixed(1)}x`}
            subtitle={
              summary.revenue.ltv_cac_ratio >= 3 ? "Excellent" : "Below target"
            }
            valueClassName={
              summary.revenue.ltv_cac_ratio >= 3
                ? "text-green-600"
                : "text-yellow-600"
            }
            icon={<Target className="h-4 w-4" />}
            clickable
            onClick={() => setOpenDialog("ltv")}
          />
        </StaggerItem>
      </StaggerChildren>

      {/* Two column layout */}
      <FadeIn delay={0.2} className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Waterfall */}
        <Card>
          <CardHeader>
            <CardTitle>MRR Movement (12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            {waterfall.length > 0 && (() => {
              // Transform waterfall data for chart
              const waterfallData = {
                starting_mrr: waterfall.find(w => w.category.includes("Starting"))?.amount || 0,
                new_mrr: waterfall.find(w => w.category.includes("New"))?.amount || 0,
                expansion_mrr: waterfall.find(w => w.category.includes("Expansion"))?.amount || 0,
                contraction_mrr: Math.abs(waterfall.find(w => w.category.includes("Contraction"))?.amount || 0),
                churned_mrr: Math.abs(waterfall.find(w => w.category.includes("Churn") && !w.category.includes("Ending"))?.amount || 0),
                ending_mrr: waterfall.find(w => w.category.includes("Ending"))?.amount || 0,
              };
              return <MRRWaterfallChart data={waterfallData} />;
            })()}
          </CardContent>
        </Card>

        {/* Customer Health Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Health Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <HealthScorePieChart
              data={{
                healthy: healthDist.Green.count,
                at_risk: healthDist.Yellow.count,
                critical: healthDist.Red.count,
              }}
            />
            <div className="mt-4 pt-4 border-t">
              <Link href="/customers">
                <Button variant="outline" className="w-full">
                  View All Customers
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Prioritized Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Monday Morning Actions</CardTitle>
            <Link href="/actions">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {actions.slice(0, 3).map((action, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 rounded-lg border bg-card cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  setSelectedAction(action);
                  setOpenDialog("action");
                }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                  {action.priority}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{action.action}</h3>
                    <Badge
                      variant={
                        action.effort === "Low"
                          ? "success"
                          : action.effort === "Medium"
                          ? "warning"
                          : "danger"
                      }
                    >
                      {action.effort} Effort
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {action.rationale}
                  </p>
                  <div className="flex items-center gap-4 pt-2">
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Expected Impact:
                      </span>
                      <span className="ml-1 font-semibold text-green-600">
                        +{formatCurrency(action.expected_arr_impact, { compact: true })}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Confidence:{" "}
                      {formatCurrency(action.confidence_low, { compact: true })} -{" "}
                      {formatCurrency(action.confidence_high, { compact: true })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Period Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-green-800 dark:text-green-400">
              New MRR (12m)
            </div>
            <div className="text-2xl font-bold text-green-600">
              +{formatCurrency(summary.period.new_mrr_12m, { compact: true })}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-blue-800 dark:text-blue-400">
              Expansion MRR (12m)
            </div>
            <div className="text-2xl font-bold text-blue-600">
              +{formatCurrency(summary.period.expansion_mrr_12m, { compact: true })}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
              Contraction MRR (12m)
            </div>
            <div className="text-2xl font-bold text-yellow-600">
              -{formatCurrency(summary.period.contraction_mrr_12m, { compact: true })}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-950/20 border-red-200">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-red-800 dark:text-red-400">
              Churn MRR (12m)
            </div>
            <div className="text-2xl font-bold text-red-600">
              -{formatCurrency(summary.period.churn_mrr_12m, { compact: true })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <PageInsights
        pageId="executive"
        pageTitle="Executive Dashboard"
        apiEndpoint="/api/ai/executive-insights"
        buttonLabel="Generate Executive Briefing"
        suggestedQuestions={[
          "What should I focus on this Monday?",
          "What are the biggest risks to ARR?",
          "Which metrics are trending poorly?",
          "Summarize our business health in 3 sentences",
        ]}
      />

      {/* Metric Detail Dialogs */}
      {/* ARR Dialog */}
      <Dialog open={openDialog === "arr"} onOpenChange={() => setOpenDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Annual Recurring Revenue (ARR)</DialogTitle>
            <DialogDescription>
              Detailed breakdown of your current ARR and its components
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">Current ARR</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary.revenue.current_arr)}
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">Current MRR</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary.revenue.current_mrr)}
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">Active Customers</div>
                <div className="text-2xl font-bold">
                  {summary.customers.total_active}
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">Avg MRR per Customer</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary.customers.avg_mrr)}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">How ARR is calculated</h4>
              <p className="text-sm text-muted-foreground">
                ARR = Monthly Recurring Revenue (MRR) × 12
              </p>
              <p className="text-sm text-muted-foreground">
                This represents the annualized value of your recurring subscription revenue.
                It excludes one-time fees and variable usage charges.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">What this means</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Your business generates {formatCurrency(summary.revenue.current_mrr)} in predictable monthly revenue</li>
                <li>Average revenue per customer is {formatCurrency(summary.customers.avg_mrr)}/month</li>
                <li>Focus on retention and expansion to grow this metric</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* NRR Dialog */}
      <Dialog open={openDialog === "nrr"} onOpenChange={() => setOpenDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Net Revenue Retention (NRR)</DialogTitle>
            <DialogDescription>
              Measures revenue growth from existing customers
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-6 border rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-2">Current NRR</div>
              <div className={`text-4xl font-bold ${summary.revenue.nrr >= 1 ? "text-green-600" : "text-red-600"}`}>
                {formatPercent(summary.revenue.nrr)}
              </div>
              <div className="mt-2 text-sm">
                {summary.revenue.nrr >= 1 ? (
                  <span className="text-green-600 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Healthy - Revenue is expanding from existing customers
                  </span>
                ) : (
                  <span className="text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Below target - Focus on reducing churn and increasing expansion
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                <div className="text-sm text-green-800 dark:text-green-400">Expansion MRR</div>
                <div className="text-xl font-bold text-green-600">
                  +{formatCurrency(summary.period.expansion_mrr_12m, { compact: true })}
                </div>
              </div>
              <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                <div className="text-sm text-red-800 dark:text-red-400">Churn MRR</div>
                <div className="text-xl font-bold text-red-600">
                  -{formatCurrency(summary.period.churn_mrr_12m, { compact: true })}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">How NRR is calculated</h4>
              <p className="text-sm text-muted-foreground">
                NRR = (Starting MRR + Expansion - Contraction - Churn) / Starting MRR
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Industry Benchmarks</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>{"<100%"}: Losing revenue from existing customers</li>
                <li>100-110%: Good retention with modest expansion</li>
                <li>{">120%"}: Excellent - Strong expansion revenue</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ARR at Risk Dialog */}
      <Dialog open={openDialog === "risk"} onOpenChange={() => setOpenDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>ARR at Risk</DialogTitle>
            <DialogDescription>
              Revenue from customers with high churn probability
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-6 border rounded-lg bg-red-50 dark:bg-red-950/20">
              <div className="text-sm text-red-800 dark:text-red-400 mb-2">Total ARR at Risk</div>
              <div className="text-4xl font-bold text-red-600">
                {formatCurrency(summary.risk.arr_at_risk, { compact: true })}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {formatPercent(summary.risk.arr_at_risk / summary.revenue.current_arr)} of total ARR
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">Churn Rate</div>
                <div className="text-2xl font-bold text-red-600">
                  {formatPercent(summary.risk.churn_rate)}
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">Critical Accounts</div>
                <div className="text-2xl font-bold text-red-600">
                  {summary.risk.critical_accounts || "N/A"}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">What counts as "at risk"?</h4>
              <p className="text-sm text-muted-foreground">
                Customers with churn probability {">"} 50% based on our ML model, considering:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                <li>Declining usage patterns</li>
                <li>Low engagement scores</li>
                <li>Negative NPS feedback</li>
                <li>Payment issues or downgrades</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Recommended Actions</h4>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                  <span>Review high-risk accounts weekly with CS team</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                  <span>Implement proactive outreach for declining usage</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                  <span>Create win-back campaigns for at-risk segments</span>
                </li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* LTV:CAC Dialog */}
      <Dialog open={openDialog === "ltv"} onOpenChange={() => setOpenDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>LTV:CAC Ratio</DialogTitle>
            <DialogDescription>
              Customer lifetime value vs. acquisition cost
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-6 border rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-2">Current Ratio</div>
              <div className={`text-4xl font-bold ${summary.revenue.ltv_cac_ratio >= 3 ? "text-green-600" : "text-yellow-600"}`}>
                {summary.revenue.ltv_cac_ratio.toFixed(1)}x
              </div>
              <div className="mt-2 text-sm">
                {summary.revenue.ltv_cac_ratio >= 3 ? (
                  <span className="text-green-600 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Excellent - Strong unit economics
                  </span>
                ) : (
                  <span className="text-yellow-600 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Below target - Optimize CAC or increase LTV
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">How it's calculated</h4>
              <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                <p className="font-mono">LTV = Avg MRR × Gross Margin % ÷ Churn Rate</p>
                <p className="font-mono">CAC = Total Sales & Marketing Cost ÷ New Customers</p>
                <p className="font-mono">Ratio = LTV ÷ CAC</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Industry Benchmarks</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>{"<1x"}: Unsustainable - losing money on customers</li>
                <li>1-3x: Acceptable but needs improvement</li>
                <li>3-5x: Good - healthy unit economics</li>
                <li>{">5x"}: Excellent - very efficient growth</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">How to improve this metric</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <div className="font-medium text-sm mb-1">Increase LTV</div>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Reduce churn rate</li>
                    <li>• Increase expansion revenue</li>
                    <li>• Improve product value</li>
                  </ul>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium text-sm mb-1">Reduce CAC</div>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Optimize ad spend</li>
                    <li>• Improve conversion rates</li>
                    <li>• Leverage word-of-mouth</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Action Item Detail Dialog */}
      <Dialog open={openDialog === "action"} onOpenChange={() => setOpenDialog(null)}>
        <DialogContent className="max-w-2xl">
          {selectedAction && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {selectedAction.priority}
                  </div>
                  {selectedAction.action}
                </DialogTitle>
                <DialogDescription>
                  Detailed implementation plan and expected impact
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Expected Impact</div>
                    <div className="text-xl font-bold text-green-600">
                      +{formatCurrency(selectedAction.expected_arr_impact, { compact: true })}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Effort Level</div>
                    <div className="text-xl font-bold">
                      <Badge variant={
                        selectedAction.effort === "Low" ? "success" :
                        selectedAction.effort === "Medium" ? "warning" : "danger"
                      }>
                        {selectedAction.effort}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Accounts Affected</div>
                    <div className="text-xl font-bold">
                      {selectedAction.affected_customers}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Rationale</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedAction.rationale}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Confidence Interval</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Low</span>
                        <span className="text-muted-foreground">Expected</span>
                        <span className="text-muted-foreground">High</span>
                      </div>
                      <div className="relative h-8 bg-gradient-to-r from-yellow-200 via-green-200 to-green-300 rounded-full">
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-green-600 rounded-full"></div>
                      </div>
                      <div className="flex justify-between text-xs mt-1 font-medium">
                        <span>{formatCurrency(selectedAction.confidence_low, { compact: true })}</span>
                        <span className="text-green-600">{formatCurrency(selectedAction.expected_arr_impact, { compact: true })}</span>
                        <span>{formatCurrency(selectedAction.confidence_high, { compact: true })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Implementation Steps</h4>
                  <div className="space-y-2">
                    {selectedAction.category === "Retention" ? (
                      <>
                        <div className="flex items-start gap-2 text-sm">
                          <div className="mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs">1</div>
                          <div>
                            <div className="font-medium">Identify at-risk accounts</div>
                            <div className="text-muted-foreground text-xs">Review customers with churn probability {">"}50% and MRR {">"}$1K</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <div className="mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs">2</div>
                          <div>
                            <div className="font-medium">Assign CS ownership</div>
                            <div className="text-muted-foreground text-xs">Create weekly review cadence with account managers</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <div className="mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs">3</div>
                          <div>
                            <div className="font-medium">Execute intervention playbook</div>
                            <div className="text-muted-foreground text-xs">Schedule QBRs, provide training, identify product gaps</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <div className="mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs">4</div>
                          <div>
                            <div className="font-medium">Track outcomes</div>
                            <div className="text-muted-foreground text-xs">Monitor health score improvements and retention rates</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start gap-2 text-sm">
                          <div className="mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs">1</div>
                          <div>
                            <div className="font-medium">Prioritize expansion opportunities</div>
                            <div className="text-muted-foreground text-xs">Focus on high-usage accounts ready for upgrades</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <div className="mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs">2</div>
                          <div>
                            <div className="font-medium">Create expansion playbook</div>
                            <div className="text-muted-foreground text-xs">Define triggers, messaging, and success metrics</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <div className="mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs">3</div>
                          <div>
                            <div className="font-medium">Execute outreach campaign</div>
                            <div className="text-muted-foreground text-xs">Coordinate between CS and Sales teams</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <div className="mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs">4</div>
                          <div>
                            <div className="font-medium">Measure conversion rate</div>
                            <div className="text-muted-foreground text-xs">Track expansion ARR and time-to-upgrade</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    className="w-full"
                    onClick={() => {
                      alert(`Action "${selectedAction?.action}" has been assigned to team member. They will be notified via email.`);
                      setOpenDialog(null);
                    }}
                  >
                    Assign to Team Member
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
