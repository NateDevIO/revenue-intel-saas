"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getRevenueAtRisk,
  getRevenueLeakage,
  getAtRiskCustomers,
  getChurnBySegment,
  getLTVCACMetrics,
  getNRRTrend,
} from "@/lib/api";
import {
  formatCurrency,
  formatPercent,
  formatDays,
  getChurnColor,
  getRiskLevel,
} from "@/lib/utils";
import type { RevenueAtRisk, AtRiskCustomer, LTVCACMetrics } from "@/types";
import {
  AlertTriangle,
  TrendingDown,
  DollarSign,
  ArrowUpDown,
  Clock,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Info,
  Target,
  Users,
} from "lucide-react";
import { ChurnDistributionChart } from "@/components/charts";

type MetricDialog = "arr" | "nrr" | "risk" | "ltv" | null;

export default function RiskPage() {
  const [revenueRisk, setRevenueRisk] = useState<RevenueAtRisk | null>(null);
  const [leakage, setLeakage] = useState<any[]>([]);
  const [atRiskCustomers, setAtRiskCustomers] = useState<AtRiskCustomer[]>([]);
  const [churnBySegment, setChurnBySegment] = useState<any[]>([]);
  const [ltvCac, setLtvCac] = useState<any>(null);
  const [nrrTrend, setNrrTrend] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [sortBy, setSortBy] = useState<string>("arr_at_risk");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [openDialog, setOpenDialog] = useState<MetricDialog>(null);
  const [selectedSegment, setSelectedSegment] = useState<any>(null);
  const [selectedLtvSegment, setSelectedLtvSegment] = useState<any>(null);
  const [selectedLeakage, setSelectedLeakage] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [risk, leak, atRisk, churn, ltv, nrr] = await Promise.all([
          getRevenueAtRisk(),
          getRevenueLeakage(),
          getAtRiskCustomers(0.5),
          getChurnBySegment(),
          getLTVCACMetrics(),
          getNRRTrend(),
        ]);
        setRevenueRisk(risk);
        setLeakage(leak);
        setAtRiskCustomers(atRisk);
        setChurnBySegment(churn);
        setLtvCac(ltv);
        setNrrTrend(nrr);
      } catch (err) {
        console.error("Failed to load risk data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const sortedCustomers = [...atRiskCustomers].sort((a, b) => {
    let aVal: any, bVal: any;
    switch (sortBy) {
      case "company_name":
        aVal = a.company_name;
        bVal = b.company_name;
        break;
      case "churn_probability":
        aVal = a.churn_probability;
        bVal = b.churn_probability;
        break;
      case "arr":
        aVal = a.arr;
        bVal = b.arr;
        break;
      case "arr_at_risk":
      default:
        aVal = a.arr_at_risk;
        bVal = b.arr_at_risk;
        break;
    }

    if (typeof aVal === "string") {
      return sortOrder === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Revenue at Risk</h1>
        <p className="text-muted-foreground">
          Identify and address revenue risks before they impact the business
        </p>
      </div>

      {/* Risk Summary Cards - Matching Executive Summary Order */}
      {revenueRisk && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setOpenDialog("arr")}
          >
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Current ARR</div>
              <div className="text-2xl font-bold mt-1">
                {formatCurrency(revenueRisk.total_arr, { compact: true })}
              </div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setOpenDialog("nrr")}
          >
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">
                Net Revenue Retention
              </div>
              <div
                className={`text-2xl font-bold mt-1 ${
                  nrrTrend?.current_nrr >= 1 ? "text-green-600" : "text-red-600"
                }`}
              >
                {nrrTrend ? formatPercent(nrrTrend.current_nrr) : "—"}
              </div>
            </CardContent>
          </Card>
          <Card
            className="border-red-200 bg-red-50 dark:bg-red-950/20 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setOpenDialog("risk")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-red-800 dark:text-red-400">
                  ARR at Risk
                </span>
              </div>
              <div className="text-3xl font-bold text-red-600 mt-2">
                {formatCurrency(revenueRisk.total_arr_at_risk, { compact: true })}
              </div>
              <div className="text-sm text-red-600/80 mt-1">
                {formatPercent(revenueRisk.risk_percentage)} of total ARR
              </div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setOpenDialog("ltv")}
          >
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">LTV:CAC Ratio</div>
              <div
                className={`text-2xl font-bold mt-1 ${
                  ltvCac?.overall_ltv_cac >= 3 ? "text-green-600" : "text-yellow-600"
                }`}
              >
                {ltvCac ? `${ltvCac.overall_ltv_cac.toFixed(1)}x` : "—"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Churn Probability Distribution */}
      {atRiskCustomers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Churn Probability Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChurnDistributionChart
              data={(() => {
                // Create probability buckets
                const buckets = [
                  { range: "0-20", count: 0, arr_at_risk: 0 },
                  { range: "20-40", count: 0, arr_at_risk: 0 },
                  { range: "40-60", count: 0, arr_at_risk: 0 },
                  { range: "60-80", count: 0, arr_at_risk: 0 },
                  { range: "80-100", count: 0, arr_at_risk: 0 },
                ];

                atRiskCustomers.forEach((customer) => {
                  const prob = customer.churn_probability * 100;
                  if (prob < 20) buckets[0].count++;
                  else if (prob < 40) buckets[1].count++;
                  else if (prob < 60) buckets[2].count++;
                  else if (prob < 80) buckets[3].count++;
                  else buckets[4].count++;

                  if (prob < 20) buckets[0].arr_at_risk += customer.arr_at_risk;
                  else if (prob < 40) buckets[1].arr_at_risk += customer.arr_at_risk;
                  else if (prob < 60) buckets[2].arr_at_risk += customer.arr_at_risk;
                  else if (prob < 80) buckets[3].arr_at_risk += customer.arr_at_risk;
                  else buckets[4].arr_at_risk += customer.arr_at_risk;
                });

                return buckets;
              })()}
            />
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Note:</strong> This chart shows only at-risk customers (≥50% churn probability).
                Empty buckets at 0-40% indicate good news - those customers have lower risk and aren't included here.
                Focus on the 60-100% ranges for immediate intervention.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="at-risk" className="space-y-4">
        <TabsList>
          <TabsTrigger value="at-risk">At-Risk Customers</TabsTrigger>
          <TabsTrigger value="segments">Risk by Segment</TabsTrigger>
          <TabsTrigger value="leakage">Revenue Leakage</TabsTrigger>
          <TabsTrigger value="unit-economics">Unit Economics</TabsTrigger>
        </TabsList>

        {/* At-Risk Customers Tab */}
        <TabsContent value="at-risk">
          <Card>
            <CardHeader>
              <CardTitle>High-Risk Customers (≥50% Churn Probability)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("company_name")}
                    >
                      <div className="flex items-center gap-1">
                        Company
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead
                      className="text-right cursor-pointer"
                      onClick={() => handleSort("churn_probability")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Churn Prob
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-right cursor-pointer"
                      onClick={() => handleSort("arr")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        ARR
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-right cursor-pointer"
                      onClick={() => handleSort("arr_at_risk")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        ARR at Risk
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Recommended Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCustomers.slice(0, 20).map((customer) => (
                    <TableRow
                      key={customer.customer_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{customer.company_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {customer.industry}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{customer.company_size}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1">
                          <span
                            className={`font-medium ${getChurnColor(
                              customer.churn_probability
                            )}`}
                          >
                            {formatPercent(customer.churn_probability)}
                          </span>
                          <Progress
                            value={customer.churn_probability * 100}
                            className="h-1 [&>div]:bg-red-500"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(customer.arr, { compact: true })}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {formatCurrency(customer.arr_at_risk, { compact: true })}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{customer.recommended_action}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk by Segment Tab */}
        <TabsContent value="segments">
          <Card>
            <CardHeader>
              <CardTitle>Risk by Customer Segment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {revenueRisk?.by_segment.map((seg) => (
                  <div
                    key={seg.segment}
                    className="space-y-3 p-4 rounded-lg border cursor-pointer hover:shadow-lg hover:bg-muted/50 transition-all"
                    onClick={() => setSelectedSegment(seg)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold">{seg.segment}</span>
                        <span className="ml-2 text-sm text-muted-foreground">
                          {seg.customer_count} customers
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-red-600 font-semibold">
                          {formatCurrency(seg.arr_at_risk, { compact: true })} at risk
                        </div>
                        <div className="text-sm text-muted-foreground">
                          of {formatCurrency(seg.arr, { compact: true })} total
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Avg Churn Prob:</span>
                        <span className="ml-2 font-medium">
                          {formatPercent(seg.avg_churn_probability)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">% of Total Risk:</span>
                        <span className="ml-2 font-medium">
                          {formatPercent(seg.percentage_of_total_risk)}
                        </span>
                      </div>
                    </div>
                    <Progress
                      value={seg.percentage_of_total_risk * 100}
                      className="h-2 [&>div]:bg-red-500"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Leakage Tab */}
        <TabsContent value="leakage">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Leakage Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leakage.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 rounded-lg border cursor-pointer hover:shadow-lg hover:bg-muted/50 transition-all"
                    onClick={() => setSelectedLeakage(item)}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                      <TrendingDown className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{item.source}</h3>
                        <span className="text-xl font-bold text-red-600">
                          {formatCurrency(item.amount, { compact: true })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </p>
                      {item.actionable && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          <span className="font-medium">Recommendation: </span>
                          {item.recommendation}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unit Economics Tab */}
        <TabsContent value="unit-economics">
          <Card>
            <CardHeader>
              <CardTitle>LTV:CAC by Segment</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Segment</TableHead>
                    <TableHead className="text-right">LTV</TableHead>
                    <TableHead className="text-right">CAC</TableHead>
                    <TableHead className="text-right">LTV:CAC</TableHead>
                    <TableHead className="text-right">Payback (mo)</TableHead>
                    <TableHead className="text-right">Customers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ltvCac?.by_segment?.map((seg: LTVCACMetrics) => (
                    <TableRow
                      key={seg.segment}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedLtvSegment(seg)}
                    >
                      <TableCell className="font-medium">{seg.segment}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(seg.ltv, { compact: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(seg.cac, { compact: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            seg.ltv_cac_ratio >= 3
                              ? "text-green-600 font-semibold"
                              : seg.ltv_cac_ratio >= 2
                              ? "text-yellow-600 font-semibold"
                              : "text-red-600 font-semibold"
                          }
                        >
                          {seg.ltv_cac_ratio.toFixed(1)}x
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {seg.payback_months.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {seg.customer_count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                  {formatCurrency(revenueRisk?.total_arr || 0)}
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">ARR at Risk</div>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(revenueRisk?.total_arr_at_risk || 0)}
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
              <div className={`text-4xl font-bold ${(nrrTrend?.current_nrr || 0) >= 1 ? "text-green-600" : "text-red-600"}`}>
                {nrrTrend ? formatPercent(nrrTrend.current_nrr) : "—"}
              </div>
              <div className="mt-2 text-sm">
                {(nrrTrend?.current_nrr || 0) >= 1 ? (
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

            {/* NRR Trend Chart */}
            {nrrTrend?.trend && nrrTrend.trend.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">NRR Trend (Last 12 Months)</h4>
                <div className="relative h-48 p-4 bg-muted/30 rounded-lg">
                  <div className="absolute inset-4">
                    {/* 100% Baseline */}
                    <div className="absolute left-0 right-0 border-t-2 border-dashed border-green-500/30" style={{ top: '50%' }}>
                      <span className="absolute -left-2 -top-3 text-xs text-muted-foreground">100%</span>
                    </div>

                    {/* NRR Line Chart */}
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <polyline
                        points={nrrTrend.trend.map((point, idx) => {
                          const x = (idx / (nrrTrend.trend.length - 1)) * 100;
                          const y = 100 - ((point.nrr - 0.8) / 0.4) * 100; // Scale: 0.8 (80%) to 1.2 (120%)
                          return `${x},${Math.max(0, Math.min(100, y))}`;
                        }).join(' ')}
                        fill="none"
                        stroke={nrrTrend.current_nrr >= 1 ? "#22c55e" : "#ef4444"}
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                      />
                      {/* Data points */}
                      {nrrTrend.trend.map((point, idx) => {
                        const x = (idx / (nrrTrend.trend.length - 1)) * 100;
                        const y = 100 - ((point.nrr - 0.8) / 0.4) * 100;
                        return (
                          <circle
                            key={idx}
                            cx={x}
                            cy={Math.max(0, Math.min(100, y))}
                            r="1.5"
                            fill={point.nrr >= 1 ? "#22c55e" : "#ef4444"}
                            vectorEffect="non-scaling-stroke"
                          />
                        );
                      })}
                    </svg>
                  </div>

                  {/* X-axis labels */}
                  <div className="absolute bottom-0 left-4 right-4 flex justify-between text-xs text-muted-foreground">
                    <span>{nrrTrend.trend[0]?.period.substring(0, 7)}</span>
                    <span>{nrrTrend.trend[nrrTrend.trend.length - 1]?.period.substring(0, 7)}</span>
                  </div>
                </div>

                {/* Recent trend summary */}
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {nrrTrend.trend.slice(-3).reverse().map((point, idx) => (
                    <div key={idx} className="p-2 border rounded text-center">
                      <div className="text-xs text-muted-foreground">{point.period.substring(0, 7)}</div>
                      <div className={`font-semibold ${point.nrr >= 1 ? "text-green-600" : "text-red-600"}`}>
                        {formatPercent(point.nrr)}
                      </div>
                    </div>
                  )).reverse()}
                </div>
              </div>
            )}

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
                {formatCurrency(revenueRisk?.total_arr_at_risk || 0, { compact: true })}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {formatPercent(revenueRisk?.risk_percentage || 0)} of total ARR
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
              <h4 className="font-semibold">Risk by Segment</h4>
              <div className="space-y-2">
                {revenueRisk?.by_segment.map((seg, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">{seg.segment}</span>
                    <span className="text-red-600 font-semibold">
                      {formatCurrency(seg.arr_at_risk, { compact: true })}
                    </span>
                  </div>
                ))}
              </div>
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
              <div className={`text-4xl font-bold ${(ltvCac?.overall_ltv_cac || 0) >= 3 ? "text-green-600" : "text-yellow-600"}`}>
                {ltvCac ? `${ltvCac.overall_ltv_cac.toFixed(1)}x` : "—"}
              </div>
              <div className="mt-2 text-sm">
                {(ltvCac?.overall_ltv_cac || 0) >= 3 ? (
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Dialog */}
      <Dialog
        open={selectedCustomer !== null}
        onOpenChange={() => setSelectedCustomer(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedCustomer && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{selectedCustomer.company_name}</span>
                  <Badge variant="danger">
                    High Risk
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {selectedCustomer.industry} • {selectedCustomer.company_size}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <DollarSign className="h-4 w-4" />
                      Annual Revenue
                    </div>
                    <div className="text-xl font-bold">
                      {formatCurrency(selectedCustomer.arr)}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <TrendingDown className="h-4 w-4" />
                      Churn Risk
                    </div>
                    <div className={`text-xl font-bold ${getChurnColor(selectedCustomer.churn_probability)}`}>
                      {formatPercent(selectedCustomer.churn_probability)}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      ARR at Risk
                    </div>
                    <div className="text-xl font-bold text-red-600">
                      {formatCurrency(selectedCustomer.arr_at_risk)}
                    </div>
                  </div>
                </div>

                {/* Risk Alert */}
                <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-900 dark:text-red-400">
                        High Churn Risk - Immediate Action Required
                      </h4>
                      <p className="text-sm text-red-800 dark:text-red-300 mt-1">
                        This customer has a {formatPercent(selectedCustomer.churn_probability)} probability
                        of churning. Estimated ARR loss: {formatCurrency(selectedCustomer.arr_at_risk)}.
                        Priority intervention needed.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recommended Action */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Recommended Action</h4>
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <p className="text-sm">{selectedCustomer.recommended_action}</p>
                  </div>
                </div>

                {/* Intervention Steps */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Intervention Steps</h4>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 font-bold text-xs mt-0.5">
                        1
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">
                          Schedule Executive Business Review (EBR)
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Set up a meeting within 7 days to understand pain points and demonstrate ROI
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 font-bold text-xs mt-0.5">
                        2
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">
                          Analyze Usage Patterns
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Review feature adoption and identify unused capabilities that could drive value
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 font-bold text-xs mt-0.5">
                        3
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">
                          Provide Additional Training
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Offer personalized onboarding sessions or advanced training workshops
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 font-bold text-xs mt-0.5">
                        4
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">
                          Monitor Weekly
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Add to high-risk customer review list and track engagement metrics
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      alert(`Assigning ${selectedCustomer.company_name} to CSM team for immediate intervention...`);
                    }}
                  >
                    Assign to CSM
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      alert(`Opening full profile for ${selectedCustomer.company_name}...`);
                    }}
                  >
                    View Full Profile
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Segment Risk Detail Dialog */}
      <Dialog
        open={selectedSegment !== null}
        onOpenChange={() => setSelectedSegment(null)}
      >
        <DialogContent className="max-w-2xl">
          {selectedSegment && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedSegment.segment} Segment Risk Profile</DialogTitle>
                <DialogDescription>
                  Detailed risk analysis for {selectedSegment.segment} customers
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Total ARR</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(selectedSegment.arr, { compact: true })}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                    <div className="text-sm text-red-800 dark:text-red-400">ARR at Risk</div>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(selectedSegment.arr_at_risk, { compact: true })}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Customers</div>
                    <div className="text-2xl font-bold">
                      {selectedSegment.customer_count}
                    </div>
                  </div>
                </div>

                {/* Risk Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">
                      Average Churn Probability
                    </div>
                    <div className={`text-3xl font-bold ${getChurnColor(selectedSegment.avg_churn_probability)}`}>
                      {formatPercent(selectedSegment.avg_churn_probability)}
                    </div>
                    <Progress
                      value={selectedSegment.avg_churn_probability * 100}
                      className="h-2 mt-2 [&>div]:bg-red-500"
                    />
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">
                      % of Total Risk
                    </div>
                    <div className="text-3xl font-bold text-red-600">
                      {formatPercent(selectedSegment.percentage_of_total_risk)}
                    </div>
                    <Progress
                      value={selectedSegment.percentage_of_total_risk * 100}
                      className="h-2 mt-2 [&>div]:bg-red-500"
                    />
                  </div>
                </div>

                {/* Insights */}
                <div className="space-y-2">
                  <h4 className="font-semibold">Segment Characteristics</h4>
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avg ARR per Customer:</span>
                      <span className="font-medium">
                        {formatCurrency(selectedSegment.arr / selectedSegment.customer_count)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Risk Concentration:</span>
                      <span className="font-medium">
                        {formatPercent(selectedSegment.arr_at_risk / selectedSegment.arr)} of segment ARR
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="space-y-2">
                  <h4 className="font-semibold">Recommended Actions</h4>
                  <div className="space-y-2">
                    {selectedSegment.segment === "Enterprise" && (
                      <>
                        <div className="flex items-start gap-2 p-3 border rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          <div className="text-sm">
                            <div className="font-medium">Executive Relationship Program</div>
                            <div className="text-muted-foreground">Assign dedicated CSMs and establish quarterly EBRs</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-3 border rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          <div className="text-sm">
                            <div className="font-medium">Strategic Value Alignment</div>
                            <div className="text-muted-foreground">Document ROI and business outcomes quarterly</div>
                          </div>
                        </div>
                      </>
                    )}
                    {selectedSegment.segment === "Mid-Market" && (
                      <>
                        <div className="flex items-start gap-2 p-3 border rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          <div className="text-sm">
                            <div className="font-medium">Proactive Health Monitoring</div>
                            <div className="text-muted-foreground">Weekly usage tracking and early intervention for declining accounts</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-3 border rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          <div className="text-sm">
                            <div className="font-medium">Feature Adoption Programs</div>
                            <div className="text-muted-foreground">Drive deeper product engagement through training</div>
                          </div>
                        </div>
                      </>
                    )}
                    {selectedSegment.segment === "SMB" && (
                      <>
                        <div className="flex items-start gap-2 p-3 border rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          <div className="text-sm">
                            <div className="font-medium">Automated Onboarding</div>
                            <div className="text-muted-foreground">Streamline first 30 days with in-app guidance</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-3 border rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          <div className="text-sm">
                            <div className="font-medium">Self-Service Resources</div>
                            <div className="text-muted-foreground">Build knowledge base and community support</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Revenue Leakage Detail Dialog */}
      <Dialog
        open={selectedLeakage !== null}
        onOpenChange={() => setSelectedLeakage(null)}
      >
        <DialogContent className="max-w-2xl">
          {selectedLeakage && (
            <>
              <DialogHeader>
                <DialogTitle>Revenue Leakage: {selectedLeakage.source}</DialogTitle>
                <DialogDescription>
                  Breakdown and recommendations for addressing this leakage source
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Total Leakage Amount */}
                <div className="p-6 border rounded-lg bg-red-50 dark:bg-red-950/20">
                  <div className="text-sm text-red-800 dark:text-red-400 mb-2">
                    Total Revenue Leakage
                  </div>
                  <div className="text-4xl font-bold text-red-600">
                    {formatCurrency(selectedLeakage.amount)}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h4 className="font-semibold">What This Means</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedLeakage.description}
                  </p>
                </div>

                {/* Top Contributors (simulated data) */}
                <div className="space-y-2">
                  <h4 className="font-semibold">Top Contributors to This Leakage</h4>
                  <div className="space-y-2">
                    {selectedLeakage.source.toLowerCase().includes('churn') ? (
                      <>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">TechCorp Solutions</div>
                            <div className="text-xs text-muted-foreground">Enterprise - churned due to budget cuts</div>
                          </div>
                          <span className="text-red-600 font-semibold">
                            {formatCurrency(selectedLeakage.amount * 0.28, { compact: true })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">Innovation Partners LLC</div>
                            <div className="text-xs text-muted-foreground">Mid-Market - switched to competitor</div>
                          </div>
                          <span className="text-red-600 font-semibold">
                            {formatCurrency(selectedLeakage.amount * 0.22, { compact: true })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">Digital Ventures Inc</div>
                            <div className="text-xs text-muted-foreground">SMB - lack of product usage</div>
                          </div>
                          <span className="text-red-600 font-semibold">
                            {formatCurrency(selectedLeakage.amount * 0.18, { compact: true })}
                          </span>
                        </div>
                      </>
                    ) : selectedLeakage.source.toLowerCase().includes('downgrade') ? (
                      <>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">DataFlow Systems</div>
                            <div className="text-xs text-muted-foreground">Downgraded from Enterprise to Pro plan</div>
                          </div>
                          <span className="text-red-600 font-semibold">
                            {formatCurrency(selectedLeakage.amount * 0.30, { compact: true })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">CloudNet Inc</div>
                            <div className="text-xs text-muted-foreground">Reduced seat count by 40%</div>
                          </div>
                          <span className="text-red-600 font-semibold">
                            {formatCurrency(selectedLeakage.amount * 0.22, { compact: true })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">Retail Solutions Co</div>
                            <div className="text-xs text-muted-foreground">Removed premium add-ons</div>
                          </div>
                          <span className="text-red-600 font-semibold">
                            {formatCurrency(selectedLeakage.amount * 0.18, { compact: true })}
                          </span>
                        </div>
                      </>
                    ) : selectedLeakage.source.toLowerCase().includes('lost') || selectedLeakage.source.toLowerCase().includes('deal') ? (
                      <>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">Enterprise Systems Group</div>
                            <div className="text-xs text-muted-foreground">Lost to competitor - pricing concerns</div>
                          </div>
                          <span className="text-red-600 font-semibold">
                            {formatCurrency(selectedLeakage.amount * 0.26, { compact: true })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">Global Tech Partners</div>
                            <div className="text-xs text-muted-foreground">No decision - went dark after demo</div>
                          </div>
                          <span className="text-red-600 font-semibold">
                            {formatCurrency(selectedLeakage.amount * 0.21, { compact: true })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">Midwest Manufacturing Co</div>
                            <div className="text-xs text-muted-foreground">Budget constraints - timing issue</div>
                          </div>
                          <span className="text-red-600 font-semibold">
                            {formatCurrency(selectedLeakage.amount * 0.19, { compact: true })}
                          </span>
                        </div>
                      </>
                    ) : selectedLeakage.source.toLowerCase().includes('expansion') ? (
                      <>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">Innovate Solutions Ltd</div>
                            <div className="text-xs text-muted-foreground">Enterprise - declined premium tier upgrade</div>
                          </div>
                          <span className="text-red-600 font-semibold">
                            {formatCurrency(selectedLeakage.amount * 0.32, { compact: true })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">FastGrow Dynamics</div>
                            <div className="text-xs text-muted-foreground">Mid-Market - postponed additional seats</div>
                          </div>
                          <span className="text-red-600 font-semibold">
                            {formatCurrency(selectedLeakage.amount * 0.24, { compact: true })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">NextGen Services</div>
                            <div className="text-xs text-muted-foreground">SMB - rejected cross-sell opportunity</div>
                          </div>
                          <span className="text-red-600 font-semibold">
                            {formatCurrency(selectedLeakage.amount * 0.17, { compact: true })}
                          </span>
                        </div>
                      </>
                    ) : selectedLeakage.source.toLowerCase().includes('payment') ? (
                      <>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">SmallBiz LLC</div>
                            <div className="text-xs text-muted-foreground">3 months unpaid</div>
                          </div>
                          <span className="text-red-600 font-semibold">
                            {formatCurrency(selectedLeakage.amount * 0.28, { compact: true })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">QuickServe Inc</div>
                            <div className="text-xs text-muted-foreground">2 months overdue</div>
                          </div>
                          <span className="text-red-600 font-semibold">
                            {formatCurrency(selectedLeakage.amount * 0.20, { compact: true })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">Startup Hub</div>
                            <div className="text-xs text-muted-foreground">Payment failed - card expired</div>
                          </div>
                          <span className="text-red-600 font-semibold">
                            {formatCurrency(selectedLeakage.amount * 0.16, { compact: true })}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">Customer A</div>
                            <div className="text-xs text-muted-foreground">Contributing factor</div>
                          </div>
                          <span className="text-red-600 font-semibold">
                            {formatCurrency(selectedLeakage.amount * 0.35, { compact: true })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">Customer B</div>
                            <div className="text-xs text-muted-foreground">Contributing factor</div>
                          </div>
                          <span className="text-red-600 font-semibold">
                            {formatCurrency(selectedLeakage.amount * 0.25, { compact: true })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">Customer C</div>
                            <div className="text-xs text-muted-foreground">Contributing factor</div>
                          </div>
                          <span className="text-red-600 font-semibold">
                            {formatCurrency(selectedLeakage.amount * 0.18, { compact: true })}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Recommendations */}
                {selectedLeakage.actionable && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Recommended Actions</h4>
                    <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                      <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-blue-900 dark:text-blue-300">
                            {selectedLeakage.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Actions */}
                <div className="space-y-2">
                  <h4 className="font-semibold">Additional Steps to Reduce Leakage</h4>
                  <div className="space-y-2">
                    {selectedLeakage.source.toLowerCase().includes('discount') && (
                      <>
                        <div className="flex items-start gap-2 p-3 border rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          <div className="text-sm">
                            <div className="font-medium">Implement discount approval workflow</div>
                            <div className="text-muted-foreground">Require manager approval for discounts {">"}20%</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-3 border rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          <div className="text-sm">
                            <div className="font-medium">Train sales on value selling</div>
                            <div className="text-muted-foreground">Focus on ROI rather than price competition</div>
                          </div>
                        </div>
                      </>
                    )}
                    {selectedLeakage.source.toLowerCase().includes('contraction') && (
                      <>
                        <div className="flex items-start gap-2 p-3 border rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          <div className="text-sm">
                            <div className="font-medium">Proactive usage monitoring</div>
                            <div className="text-muted-foreground">Identify declining usage before downgrade requests</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-3 border rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          <div className="text-sm">
                            <div className="font-medium">Quarterly business reviews</div>
                            <div className="text-muted-foreground">Demonstrate ongoing value to prevent downgrades</div>
                          </div>
                        </div>
                      </>
                    )}
                    {selectedLeakage.source.toLowerCase().includes('payment') && (
                      <>
                        <div className="flex items-start gap-2 p-3 border rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          <div className="text-sm">
                            <div className="font-medium">Automated payment reminders</div>
                            <div className="text-muted-foreground">Send alerts before and after payment failures</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-3 border rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          <div className="text-sm">
                            <div className="font-medium">Card update campaigns</div>
                            <div className="text-muted-foreground">Proactively request updated payment information</div>
                          </div>
                        </div>
                      </>
                    )}
                    <div className="flex items-start gap-2 p-3 border rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-medium">Track and monitor trends</div>
                        <div className="text-muted-foreground">Review this leakage source monthly to measure improvement</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Potential Recovery */}
                <div className="space-y-2">
                  <h4 className="font-semibold">Recovery Potential</h4>
                  <p className="text-sm text-muted-foreground">
                    If you can address 50% of this leakage source through the recommended actions, you could recover{" "}
                    <span className="font-semibold text-green-600">
                      {formatCurrency(selectedLeakage.amount * 0.5)}
                    </span>{" "}
                    in annual revenue.
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* LTV:CAC Segment Detail Dialog */}
      <Dialog
        open={selectedLtvSegment !== null}
        onOpenChange={() => setSelectedLtvSegment(null)}
      >
        <DialogContent className="max-w-2xl">
          {selectedLtvSegment && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedLtvSegment.segment} Unit Economics</DialogTitle>
                <DialogDescription>
                  Detailed LTV:CAC analysis for {selectedLtvSegment.segment} customers
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">LTV</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(selectedLtvSegment.ltv)}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">CAC</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(selectedLtvSegment.cac)}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">LTV:CAC Ratio</div>
                    <div className={`text-2xl font-bold ${
                      selectedLtvSegment.ltv_cac_ratio >= 3
                        ? "text-green-600"
                        : selectedLtvSegment.ltv_cac_ratio >= 2
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}>
                      {selectedLtvSegment.ltv_cac_ratio.toFixed(1)}x
                    </div>
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">
                      Payback Period
                    </div>
                    <div className="text-3xl font-bold">
                      {selectedLtvSegment.payback_months.toFixed(1)} mo
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Time to recover acquisition cost
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">
                      Customers in Segment
                    </div>
                    <div className="text-3xl font-bold">
                      {selectedLtvSegment.customer_count}
                    </div>
                  </div>
                </div>

                {/* Health Assessment */}
                <div className="space-y-2">
                  <h4 className="font-semibold">Unit Economics Health</h4>
                  <div className={`p-4 rounded-lg ${
                    selectedLtvSegment.ltv_cac_ratio >= 3
                      ? "bg-green-50 dark:bg-green-950/20 border-green-200"
                      : selectedLtvSegment.ltv_cac_ratio >= 2
                      ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200"
                      : "bg-red-50 dark:bg-red-950/20 border-red-200"
                  } border`}>
                    <div className="flex items-start gap-2">
                      {selectedLtvSegment.ltv_cac_ratio >= 3 ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          <div>
                            <div className="font-medium text-green-900 dark:text-green-400">
                              Excellent Unit Economics
                            </div>
                            <p className="text-sm text-green-800 dark:text-green-300 mt-1">
                              This segment has strong unit economics with an LTV:CAC ratio of {selectedLtvSegment.ltv_cac_ratio.toFixed(1)}x.
                              Continue current strategies and consider increasing investment in this segment.
                            </p>
                          </div>
                        </>
                      ) : selectedLtvSegment.ltv_cac_ratio >= 2 ? (
                        <>
                          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <div>
                            <div className="font-medium text-yellow-900 dark:text-yellow-400">
                              Acceptable Unit Economics
                            </div>
                            <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                              This segment has acceptable but improvable unit economics. Focus on either
                              reducing CAC or increasing LTV through better retention and expansion.
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                          <div>
                            <div className="font-medium text-red-900 dark:text-red-400">
                              Needs Improvement
                            </div>
                            <p className="text-sm text-red-800 dark:text-red-300 mt-1">
                              This segment has concerning unit economics. Consider optimizing CAC spend,
                              improving conversion rates, or focusing on higher-value customer profiles.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="space-y-2">
                  <h4 className="font-semibold">Optimization Opportunities</h4>
                  <div className="grid gap-3">
                    <div className="p-3 border rounded-lg">
                      <div className="font-medium text-sm mb-1">Reduce CAC</div>
                      <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                        <li>Optimize marketing channel mix</li>
                        <li>Improve sales conversion rates</li>
                        <li>Leverage customer referrals</li>
                      </ul>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="font-medium text-sm mb-1">Increase LTV</div>
                      <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                        <li>Reduce churn through better onboarding</li>
                        <li>Drive expansion revenue (upsells/cross-sells)</li>
                        <li>Increase pricing or product value</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
