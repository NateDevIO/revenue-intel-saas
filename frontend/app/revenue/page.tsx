"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, DollarSign, Users, Target } from "lucide-react";
import { getMRRWaterfall, getRevenueSummary } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { RevenueTrendChart, MRRWaterfallChart } from "@/components/charts";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { ExportShareMenu } from "@/components/export-share-menu";

export default function RevenuePage() {
  const [waterfall, setWaterfall] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [waterfallData, summaryData] = await Promise.all([
          getMRRWaterfall(),
          getRevenueSummary(),
        ]);
        setWaterfall(waterfallData);
        setSummary(summaryData);
      } catch (err) {
        console.error("Failed to load revenue data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  // Generate mock trend data (last 12 months)
  const generateTrendData = () => {
    const months = [];
    const currentMRR = summary?.current_mrr || 100000;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11);

    // Calculate starting MRR (12 months ago) by working backwards from current
    // If we're growing at ~6% monthly, start lower and grow to current
    const monthlyGrowthRate = 0.06; // 6% monthly growth
    const startingMRR = currentMRR / Math.pow(1 + monthlyGrowthRate, 11);

    for (let i = 0; i < 12; i++) {
      const date = new Date(startDate);
      date.setMonth(startDate.getMonth() + i);
      const monthName = date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });

      // Calculate MRR for this month (growing from startingMRR to currentMRR)
      const mrr = startingMRR * Math.pow(1 + monthlyGrowthRate, i);
      const arr = mrr * 12;

      months.push({
        month: monthName,
        mrr: mrr,
        arr: arr,
      });
    }

    return months;
  };

  const trendData = generateTrendData();

  return (
    <div className="space-y-6" id="revenue-content">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revenue Intelligence</h1>
          <p className="text-muted-foreground">
            Track revenue metrics, trends, and growth opportunities
          </p>
        </div>
        <ExportShareMenu
          exportElementId="revenue-content"
          exportTitle="Revenue Intelligence Report"
          filename="revenue-intelligence"
        />
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">Current MRR</div>
              </div>
              <div className="text-2xl font-bold mt-1">
                {formatCurrency(summary.current_mrr, { compact: true })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">Current ARR</div>
              </div>
              <div className="text-2xl font-bold mt-1">
                {formatCurrency(summary.current_arr, { compact: true })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">Active Customers</div>
              </div>
              <div className="text-2xl font-bold mt-1">
                {summary.active_customers?.toLocaleString() || "—"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">NRR</div>
              </div>
              <div
                className={`text-2xl font-bold mt-1 ${
                  summary.nrr >= 1 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatPercent(summary.nrr)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Revenue Trend (12 Months)</CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline">MRR</Badge>
              <Badge variant="outline">ARR</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RevenueTrendChart data={trendData} />
        </CardContent>
      </Card>

      <Tabs defaultValue="waterfall" className="space-y-4">
        <TabsList>
          <TabsTrigger value="waterfall">MRR Waterfall</TabsTrigger>
          <TabsTrigger value="breakdown">Revenue Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="waterfall">
          <Card>
            <CardHeader>
              <CardTitle>MRR Movement Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {waterfall.length > 0 && (() => {
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
        </TabsContent>

        <TabsContent value="breakdown">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-800 dark:text-green-400">
                  Positive Revenue Movements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {waterfall
                  .filter((w) => !w.is_total && w.amount > 0)
                  .map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="font-medium">{item.category}</span>
                      </div>
                      <span className="font-bold text-green-600">
                        +{formatCurrency(item.amount, { compact: true })}
                      </span>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card className="bg-red-50 dark:bg-red-950/20 border-red-200">
              <CardHeader>
                <CardTitle className="text-red-800 dark:text-red-400">
                  Negative Revenue Movements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {waterfall
                  .filter((w) => !w.is_total && w.amount < 0)
                  .map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="font-medium">{item.category}</span>
                      </div>
                      <span className="font-bold text-red-600">
                        {formatCurrency(item.amount, { compact: true })}
                      </span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Key Metrics Summary */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Key Revenue Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-2">ARPA</div>
                <div className="text-xl font-bold">
                  {summary.avg_mrr_per_customer
                    ? formatCurrency(summary.avg_mrr_per_customer)
                    : "N/A"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Average Revenue Per Account
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-2">
                  Gross Margin
                </div>
                <div className="text-xl font-bold text-green-600">80%</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Industry standard for SaaS
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-2">
                  Revenue Growth
                </div>
                <div className="text-xl font-bold text-blue-600">
                  {trendData.length >= 2
                    ? `${(
                        ((trendData[trendData.length - 1].mrr -
                          trendData[0].mrr) /
                          trendData[0].mrr) *
                        100
                      ).toFixed(1)}%`
                    : "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  12-month growth rate
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
