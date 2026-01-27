"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getPrioritizedActions,
  getInterventionRecommendations,
  getBenchmarks,
} from "@/lib/api";
import { formatCurrency, formatPercent, getEffortColor } from "@/lib/utils";
import type { ActionItem, Benchmarks } from "@/types";
import {
  Target,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  CheckCircle2,
} from "lucide-react";

type BenchmarkType = "nrr" | "ltv_cac_ratio" | "payback_months" | "monthly_churn_rate" | null;

export default function ActionsPage() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [totalImpact, setTotalImpact] = useState(0);
  const [interventions, setInterventions] = useState<any>(null);
  const [benchmarks, setBenchmarks] = useState<Benchmarks | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);
  const [selectedBenchmark, setSelectedBenchmark] = useState<BenchmarkType>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [actionsData, interventionsData, benchmarksData] = await Promise.all([
          getPrioritizedActions(),
          getInterventionRecommendations(50000),
          getBenchmarks(),
        ]);
        setActions(actionsData.recommendations);
        setTotalImpact(actionsData.total_potential_impact);
        setInterventions(interventionsData);
        setBenchmarks(benchmarksData);
      } catch (err) {
        console.error("Failed to load actions:", err);
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

  const getBenchmarkStatus = (
    metric: keyof Benchmarks
  ): { icon: React.ReactNode; color: string } => {
    if (!benchmarks) return { icon: null, color: "" };
    const rating = benchmarks[metric].rating;
    if (rating === "Excellent" || rating === "Good") {
      return {
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
        color: "text-green-600",
      };
    }
    if (rating === "Fair") {
      return {
        icon: <AlertCircle className="h-5 w-5 text-yellow-600" />,
        color: "text-yellow-600",
      };
    }
    return {
      icon: <AlertCircle className="h-5 w-5 text-red-600" />,
      color: "text-red-600",
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Prioritized Actions</h1>
        <p className="text-muted-foreground">
          What should you do Monday morning? Ranked by expected ARR impact.
        </p>
      </div>

      {/* Impact Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Total Potential Impact
                </div>
                <div className="text-2xl font-bold text-primary">
                  +{formatCurrency(totalImpact, { compact: true })} ARR
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {interventions && (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Expected ARR Saved
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(
                        interventions.summary.total_expected_arr_saved,
                        { compact: true }
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Expected ROI
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatPercent(interventions.summary.expected_roi)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Prioritized Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Top Actions by Expected Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {actions.map((action, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer hover:shadow-lg"
                onClick={() => setSelectedAction(action)}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                  {action.priority}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{action.action}</h3>
                      {action.category && (
                        <Badge variant="outline" className="mt-1">
                          {action.category}
                        </Badge>
                      )}
                    </div>
                    <Badge
                      className={getEffortColor(action.effort)}
                      variant="secondary"
                    >
                      {action.effort} Effort
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">{action.rationale}</p>

                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Expected Impact
                      </div>
                      <div className="font-semibold text-green-600">
                        +{formatCurrency(action.expected_arr_impact, { compact: true })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Confidence Range
                      </div>
                      <div className="font-medium">
                        {formatCurrency(action.confidence_low, { compact: true })} -{" "}
                        {formatCurrency(action.confidence_high, { compact: true })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Affected Customers
                      </div>
                      <div className="font-medium">{action.affected_customers}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Benchmarks */}
      {benchmarks && (
        <Card>
          <CardHeader>
            <CardTitle>Performance vs Industry Benchmarks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {/* NRR */}
              <div
                className="p-4 rounded-lg border cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedBenchmark("nrr")}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Net Revenue Retention</span>
                  {getBenchmarkStatus("nrr").icon}
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-2xl font-bold ${
                      getBenchmarkStatus("nrr").color
                    }`}
                  >
                    {formatPercent(benchmarks.nrr.our_value)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    vs {formatPercent(benchmarks.nrr.benchmark_median)} median
                  </span>
                </div>
                <Progress
                  value={Math.min(
                    (benchmarks.nrr.our_value / benchmarks.nrr.benchmark_top_quartile) *
                      100,
                    100
                  )}
                  className="mt-2"
                />
                <Badge variant="outline" className="mt-2">
                  {benchmarks.nrr.rating}
                </Badge>
              </div>

              {/* LTV:CAC */}
              <div
                className="p-4 rounded-lg border cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedBenchmark("ltv_cac_ratio")}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">LTV:CAC Ratio</span>
                  {getBenchmarkStatus("ltv_cac_ratio").icon}
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-2xl font-bold ${
                      getBenchmarkStatus("ltv_cac_ratio").color
                    }`}
                  >
                    {benchmarks.ltv_cac_ratio.our_value.toFixed(1)}x
                  </span>
                  <span className="text-sm text-muted-foreground">
                    vs {benchmarks.ltv_cac_ratio.benchmark_median}x median
                  </span>
                </div>
                <Progress
                  value={Math.min(
                    (benchmarks.ltv_cac_ratio.our_value /
                      benchmarks.ltv_cac_ratio.benchmark_top_quartile) *
                      100,
                    100
                  )}
                  className="mt-2"
                />
                <Badge variant="outline" className="mt-2">
                  {benchmarks.ltv_cac_ratio.rating}
                </Badge>
              </div>

              {/* Payback */}
              <div
                className="p-4 rounded-lg border cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedBenchmark("payback_months")}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Payback Period</span>
                  {getBenchmarkStatus("payback_months").icon}
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-2xl font-bold ${
                      getBenchmarkStatus("payback_months").color
                    }`}
                  >
                    {benchmarks.payback_months.our_value.toFixed(0)} mo
                  </span>
                  <span className="text-sm text-muted-foreground">
                    vs {benchmarks.payback_months.benchmark_median} mo median
                  </span>
                </div>
                <Progress
                  value={Math.min(
                    ((benchmarks.payback_months.benchmark_bottom_quartile -
                      benchmarks.payback_months.our_value) /
                      benchmarks.payback_months.benchmark_bottom_quartile) *
                      100 +
                      50,
                    100
                  )}
                  className="mt-2"
                />
                <Badge variant="outline" className="mt-2">
                  {benchmarks.payback_months.rating}
                </Badge>
              </div>

              {/* Churn */}
              <div
                className="p-4 rounded-lg border cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedBenchmark("monthly_churn_rate")}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Monthly Churn Rate</span>
                  {getBenchmarkStatus("monthly_churn_rate").icon}
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-2xl font-bold ${
                      getBenchmarkStatus("monthly_churn_rate").color
                    }`}
                  >
                    {formatPercent(benchmarks.monthly_churn_rate.our_value)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    vs {formatPercent(benchmarks.monthly_churn_rate.benchmark_median)}{" "}
                    median
                  </span>
                </div>
                <Progress
                  value={Math.min(
                    ((benchmarks.monthly_churn_rate.benchmark_bottom_quartile -
                      benchmarks.monthly_churn_rate.our_value) /
                      benchmarks.monthly_churn_rate.benchmark_bottom_quartile) *
                      100,
                    100
                  )}
                  className="mt-2"
                />
                <Badge variant="outline" className="mt-2">
                  {benchmarks.monthly_churn_rate.rating}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Item Detail Dialog */}
      <Dialog open={selectedAction !== null} onOpenChange={() => setSelectedAction(null)}>
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
                      setSelectedAction(null);
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

      {/* Benchmark Detail Dialogs */}
      {benchmarks && (
        <>
          {/* NRR Benchmark Dialog */}
          <Dialog open={selectedBenchmark === "nrr"} onOpenChange={() => setSelectedBenchmark(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Net Revenue Retention (NRR) Benchmark</DialogTitle>
                <DialogDescription>
                  How your NRR compares to industry standards
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Your NRR</div>
                    <div className={`text-3xl font-bold ${getBenchmarkStatus("nrr").color}`}>
                      {formatPercent(benchmarks.nrr.our_value)}
                    </div>
                    <Badge variant="outline" className="mt-2">
                      {benchmarks.nrr.rating}
                    </Badge>
                  </div>
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">Industry Median</div>
                    <div className="text-3xl font-bold">
                      {formatPercent(benchmarks.nrr.benchmark_median)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Industry Quartiles</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Top Quartile (75th percentile):</span>
                      <span className="font-medium">{formatPercent(benchmarks.nrr.benchmark_top_quartile)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Median (50th percentile):</span>
                      <span className="font-medium">{formatPercent(benchmarks.nrr.benchmark_median)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Bottom Quartile (25th percentile):</span>
                      <span className="font-medium">{formatPercent(benchmarks.nrr.benchmark_bottom_quartile)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">What this means</h4>
                  <p className="text-sm text-muted-foreground">
                    {benchmarks.nrr.rating === "Excellent" && "Your NRR is in the top quartile - you're retaining and expanding revenue from existing customers exceptionally well."}
                    {benchmarks.nrr.rating === "Good" && "Your NRR is above the median - you're performing well but there's room to optimize expansion and retention."}
                    {benchmarks.nrr.rating === "Fair" && "Your NRR is near the median - focus on reducing churn and increasing expansion revenue."}
                    {benchmarks.nrr.rating === "Poor" && "Your NRR is below industry standards - prioritize customer retention and expansion initiatives immediately."}
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* LTV:CAC Benchmark Dialog */}
          <Dialog open={selectedBenchmark === "ltv_cac_ratio"} onOpenChange={() => setSelectedBenchmark(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>LTV:CAC Ratio Benchmark</DialogTitle>
                <DialogDescription>
                  How your unit economics compare to industry standards
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Your LTV:CAC</div>
                    <div className={`text-3xl font-bold ${getBenchmarkStatus("ltv_cac_ratio").color}`}>
                      {benchmarks.ltv_cac_ratio.our_value.toFixed(1)}x
                    </div>
                    <Badge variant="outline" className="mt-2">
                      {benchmarks.ltv_cac_ratio.rating}
                    </Badge>
                  </div>
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">Industry Median</div>
                    <div className="text-3xl font-bold">
                      {benchmarks.ltv_cac_ratio.benchmark_median}x
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">What good looks like</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>{"<1x"}: Unsustainable - losing money on each customer</li>
                    <li>1-3x: Acceptable but needs improvement</li>
                    <li>3-5x: Good - healthy unit economics</li>
                    <li>{">5x"}: Excellent - very efficient customer acquisition</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Payback Period Benchmark Dialog */}
          <Dialog open={selectedBenchmark === "payback_months"} onOpenChange={() => setSelectedBenchmark(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>CAC Payback Period Benchmark</DialogTitle>
                <DialogDescription>
                  How quickly you recover customer acquisition costs
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Your Payback Period</div>
                    <div className={`text-3xl font-bold ${getBenchmarkStatus("payback_months").color}`}>
                      {benchmarks.payback_months.our_value.toFixed(0)} mo
                    </div>
                    <Badge variant="outline" className="mt-2">
                      {benchmarks.payback_months.rating}
                    </Badge>
                  </div>
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">Industry Median</div>
                    <div className="text-3xl font-bold">
                      {benchmarks.payback_months.benchmark_median} mo
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">What this means</h4>
                  <p className="text-sm text-muted-foreground">
                    CAC payback period is how long it takes to earn back what you spent acquiring a customer.
                    Shorter is better - it means faster capital efficiency and growth.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Industry Standards</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>{"<6 months"}: Excellent - very capital efficient</li>
                    <li>6-12 months: Good - healthy payback period</li>
                    <li>12-18 months: Acceptable for enterprise SaaS</li>
                    <li>{">18 months"}: Needs improvement - slow capital recovery</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Monthly Churn Rate Benchmark Dialog */}
          <Dialog open={selectedBenchmark === "monthly_churn_rate"} onOpenChange={() => setSelectedBenchmark(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Monthly Churn Rate Benchmark</DialogTitle>
                <DialogDescription>
                  How your customer retention compares to industry standards
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Your Churn Rate</div>
                    <div className={`text-3xl font-bold ${getBenchmarkStatus("monthly_churn_rate").color}`}>
                      {formatPercent(benchmarks.monthly_churn_rate.our_value)}
                    </div>
                    <Badge variant="outline" className="mt-2">
                      {benchmarks.monthly_churn_rate.rating}
                    </Badge>
                  </div>
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">Industry Median</div>
                    <div className="text-3xl font-bold">
                      {formatPercent(benchmarks.monthly_churn_rate.benchmark_median)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">What this means</h4>
                  <p className="text-sm text-muted-foreground">
                    Lower churn rates mean better customer retention and more predictable revenue.
                    For SaaS businesses, churn is one of the most critical metrics to optimize.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Industry Benchmarks by Segment</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>SMB SaaS: 3-7% monthly churn</li>
                    <li>Mid-Market SaaS: 1-2% monthly churn</li>
                    <li>Enterprise SaaS: {"<1%"} monthly churn</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
