"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  getFunnelSummary,
  getConversionRates,
  getVelocityMetrics,
  getCohortAnalysis,
  getLossReasons,
  getRepPerformance,
  getFunnelBySegment,
} from "@/lib/api";
import { formatCurrency, formatPercent, FUNNEL_COLORS } from "@/lib/utils";
import type {
  FunnelSummary,
  ConversionRate,
  VelocityMetrics,
  CohortData,
  LossReason,
  RepPerformance,
} from "@/types";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { FunnelChart } from "@/components/charts";

export default function FunnelPage() {
  const [summary, setSummary] = useState<FunnelSummary | null>(null);
  const [conversions, setConversions] = useState<ConversionRate[]>([]);
  const [velocity, setVelocity] = useState<VelocityMetrics[]>([]);
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [lossReasons, setLossReasons] = useState<LossReason[]>([]);
  const [repPerformance, setRepPerformance] = useState<RepPerformance[]>([]);
  const [segmentData, setSegmentData] = useState<any[]>([]);
  const [selectedSegment, setSelectedSegment] = useState("company_size");
  const [loading, setLoading] = useState(true);
  const [selectedRep, setSelectedRep] = useState<RepPerformance | null>(null);
  const [selectedCohort, setSelectedCohort] = useState<CohortData | null>(null);
  const [selectedFunnelSegment, setSelectedFunnelSegment] = useState<any>(null);
  const [selectedStage, setSelectedStage] = useState<any>(null);
  const [selectedVelocity, setSelectedVelocity] = useState<VelocityMetrics | null>(null);
  const [selectedLossReason, setSelectedLossReason] = useState<LossReason | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [summ, conv, vel, coh, loss, reps, seg] = await Promise.all([
          getFunnelSummary(),
          getConversionRates(),
          getVelocityMetrics(),
          getCohortAnalysis(),
          getLossReasons(),
          getRepPerformance(),
          getFunnelBySegment(selectedSegment),
        ]);
        setSummary(summ);
        setConversions(conv);
        setVelocity(vel);
        setCohorts(coh);
        setLossReasons(loss);
        setRepPerformance(reps);
        setSegmentData(seg);
      } catch (err) {
        console.error("Failed to load funnel data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedSegment]);

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
        <h1 className="text-3xl font-bold tracking-tight">Funnel Analysis</h1>
        <p className="text-muted-foreground">
          Sales pipeline performance and conversion analytics
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">
                Total Opportunities
              </div>
              <div className="text-2xl font-bold">
                {summary.total_opportunities.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Pipeline Value</div>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.total_pipeline_value, { compact: true })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Win Rate</div>
              <div className="text-2xl font-bold text-green-600">
                {formatPercent(summary.overall_conversion_rate)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Won Revenue</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.closed_won_value, { compact: true })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="conversion" className="space-y-4">
        <TabsList>
          <TabsTrigger value="conversion">Conversion Rates</TabsTrigger>
          <TabsTrigger value="velocity">Velocity</TabsTrigger>
          <TabsTrigger value="segments">By Segment</TabsTrigger>
          <TabsTrigger value="loss">Loss Reasons</TabsTrigger>
          <TabsTrigger value="reps">Rep Performance</TabsTrigger>
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
        </TabsList>

        {/* Conversion Rates Tab */}
        <TabsContent value="conversion" className="space-y-4">
          {/* Visual Funnel Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Funnel Visualization</CardTitle>
            </CardHeader>
            <CardContent>
              {conversions.length > 0 && (() => {
                // Build funnel data from conversions
                const funnelData = [];

                // Add first stage
                if (conversions[0]) {
                  funnelData.push({
                    stage: conversions[0].from_stage,
                    count: conversions[0].from_count,
                    value: conversions[0].from_value,
                  });
                }

                // Add all "to" stages
                conversions.forEach(conv => {
                  funnelData.push({
                    stage: conv.to_stage,
                    count: conv.to_count,
                    value: conv.to_value,
                    conversion_rate: conv.conversion_rate,
                  });
                });

                return <FunnelChart data={funnelData} />;
              })()}
            </CardContent>
          </Card>

          {/* Detailed Conversion Rates */}
          <Card>
            <CardHeader>
              <CardTitle>Stage Conversion Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {conversions.map((conv, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          style={{
                            backgroundColor: FUNNEL_COLORS[conv.from_stage],
                          }}
                        >
                          {conv.from_stage}
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge
                          style={{
                            backgroundColor: FUNNEL_COLORS[conv.to_stage],
                          }}
                        >
                          {conv.to_stage}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatPercent(conv.conversion_rate)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {conv.to_count.toLocaleString()} of{" "}
                          {conv.from_count.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <Progress
                      value={conv.conversion_rate * 100}
                      className="h-2"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        Dollar conversion:{" "}
                        {formatPercent(conv.dollar_conversion_rate)}
                      </span>
                      <span>
                        {formatCurrency(conv.to_value, { compact: true })} of{" "}
                        {formatCurrency(conv.from_value, { compact: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Velocity Tab */}
        <TabsContent value="velocity">
          <Card>
            <CardHeader>
              <CardTitle>Time-to-Stage Velocity</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stage Transition</TableHead>
                    <TableHead className="text-right">Median Days</TableHead>
                    <TableHead className="text-right">P75 Days</TableHead>
                    <TableHead className="text-right">Avg Days</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {velocity.map((v, index) => (
                    <TableRow
                      key={index}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedVelocity(v)}
                    >
                      <TableCell className="font-medium">
                        {v.from_stage} → {v.to_stage}
                      </TableCell>
                      <TableCell className="text-right">{v.median_days}</TableCell>
                      <TableCell className="text-right">{v.p75_days}</TableCell>
                      <TableCell className="text-right">
                        {v.avg_days.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">{v.count}</TableCell>
                      <TableCell>
                        {v.has_slow_deals ? (
                          <Badge variant="warning">Slow Deals</Badge>
                        ) : (
                          <Badge variant="success">On Track</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Segments Tab */}
        <TabsContent value="segments">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Performance by Segment</CardTitle>
                <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company_size">Company Size</SelectItem>
                    <SelectItem value="channel">Channel</SelectItem>
                    <SelectItem value="industry">Industry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Segment</TableHead>
                    <TableHead className="text-right">Opportunities</TableHead>
                    <TableHead className="text-right">Win Rate</TableHead>
                    <TableHead className="text-right">Won Value</TableHead>
                    <TableHead className="text-right">Avg Deal Size</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {segmentData.map((seg, index) => (
                    <TableRow
                      key={index}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedFunnelSegment(seg)}
                    >
                      <TableCell className="font-medium">{seg.segment}</TableCell>
                      <TableCell className="text-right">
                        {seg.total_opportunities}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPercent(seg.win_rate)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(seg.won_value, { compact: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(seg.avg_won_deal_size, { compact: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loss Reasons Tab */}
        <TabsContent value="loss">
          <Card>
            <CardHeader>
              <CardTitle>Loss Reason Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reason</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">% of Losses</TableHead>
                    <TableHead className="text-right">Lost Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lossReasons.map((loss, index) => (
                    <TableRow
                      key={index}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedLossReason(loss)}
                    >
                      <TableCell className="font-medium">{loss.reason}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{loss.stage}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{loss.count}</TableCell>
                      <TableCell className="text-right">
                        {formatPercent(loss.percentage)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(loss.lost_value, { compact: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rep Performance Tab */}
        <TabsContent value="reps">
          <Card>
            <CardHeader>
              <CardTitle>Sales Rep Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rep</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead className="text-right">Deals Won</TableHead>
                    <TableHead className="text-right">Win Rate</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">vs Team</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repPerformance.map((rep) => (
                    <TableRow
                      key={rep.rep_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedRep(rep)}
                    >
                      <TableCell className="font-medium">{rep.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rep.segment}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{rep.deals_won}</TableCell>
                      <TableCell className="text-right">
                        {formatPercent(rep.win_rate)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(rep.total_revenue, { compact: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            rep.performance_vs_team >= 1
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {(rep.performance_vs_team * 100).toFixed(0)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cohorts Tab */}
        <TabsContent value="cohorts">
          <Card>
            <CardHeader>
              <CardTitle>Cohort Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cohort</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Conversions</TableHead>
                    <TableHead className="text-right">Conv. Rate</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Avg Deal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cohorts.slice(-12).map((cohort) => (
                    <TableRow
                      key={cohort.cohort}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedCohort(cohort)}
                    >
                      <TableCell className="font-medium">
                        {cohort.cohort.substring(0, 7)}
                      </TableCell>
                      <TableCell className="text-right">{cohort.leads}</TableCell>
                      <TableCell className="text-right">
                        {cohort.conversions}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPercent(cohort.conversion_rate)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(cohort.revenue, { compact: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(cohort.avg_deal_size, { compact: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sales Rep Detail Dialog */}
      <Dialog open={selectedRep !== null} onOpenChange={() => setSelectedRep(null)}>
        {selectedRep && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedRep.name} - Performance Breakdown</DialogTitle>
              <DialogDescription>
                Detailed sales performance metrics for {selectedRep.segment} segment
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Total Revenue</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedRep.total_revenue, { compact: true })}
                  </div>
                </div>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Deals Won</div>
                  <div className="text-2xl font-bold">{selectedRep.deals_won}</div>
                </div>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Win Rate</div>
                  <div className="text-2xl font-bold">{formatPercent(selectedRep.win_rate)}</div>
                </div>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">vs Team Average</div>
                  <div className={`text-2xl font-bold ${selectedRep.performance_vs_team >= 1 ? "text-green-600" : "text-red-600"}`}>
                    {(selectedRep.performance_vs_team * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Performance Analysis</h4>
                <div className="p-4 border rounded-lg space-y-2">
                  {selectedRep.performance_vs_team >= 1.1 ? (
                    <>
                      <p className="text-sm text-green-600 font-medium">⭐ Top Performer</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedRep.name} is performing {((selectedRep.performance_vs_team - 1) * 100).toFixed(0)}% above team average.
                        This rep is a strong contributor to {selectedRep.segment} segment success.
                      </p>
                    </>
                  ) : selectedRep.performance_vs_team >= 0.9 ? (
                    <>
                      <p className="text-sm font-medium">✓ On Track</p>
                      <p className="text-sm text-muted-foreground">
                        Performance is within expected range for {selectedRep.segment} segment. Continue current strategy.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-red-600 font-medium">⚠ Needs Attention</p>
                      <p className="text-sm text-muted-foreground">
                        Performance is {((1 - selectedRep.performance_vs_team) * 100).toFixed(0)}% below team average.
                        Consider additional coaching or pipeline support.
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Recommended Actions</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  {selectedRep.win_rate < 0.15 && (
                    <li>Focus on lead qualification to improve win rate</li>
                  )}
                  {selectedRep.performance_vs_team < 0.9 && (
                    <li>Schedule 1:1 coaching session to identify blockers</li>
                  )}
                  {selectedRep.deals_won < 5 && (
                    <li>Review pipeline coverage and activity levels</li>
                  )}
                  {selectedRep.performance_vs_team >= 1.1 && (
                    <>
                      <li>Document best practices for team training</li>
                      <li>Consider mentorship role for newer reps</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Cohort Detail Dialog */}
      <Dialog open={selectedCohort !== null} onOpenChange={() => setSelectedCohort(null)}>
        {selectedCohort && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Cohort {selectedCohort.cohort.substring(0, 7)} Breakdown</DialogTitle>
              <DialogDescription>
                Performance analysis for leads acquired in {selectedCohort.cohort.substring(0, 7)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Total Leads</div>
                  <div className="text-2xl font-bold">{selectedCohort.leads.toLocaleString()}</div>
                </div>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Conversions</div>
                  <div className="text-2xl font-bold text-green-600">{selectedCohort.conversions}</div>
                </div>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Conversion Rate</div>
                  <div className="text-2xl font-bold">{formatPercent(selectedCohort.conversion_rate)}</div>
                </div>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Total Revenue</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedCohort.revenue, { compact: true })}
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="text-sm text-muted-foreground mb-1">Average Deal Size</div>
                <div className="text-2xl font-bold">{formatCurrency(selectedCohort.avg_deal_size, { compact: true })}</div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Cohort Performance</h4>
                <div className="p-4 border rounded-lg space-y-2">
                  {selectedCohort.conversion_rate >= 0.10 ? (
                    <>
                      <p className="text-sm text-green-600 font-medium">✓ Strong Cohort</p>
                      <p className="text-sm text-muted-foreground">
                        This cohort has a conversion rate of {formatPercent(selectedCohort.conversion_rate)}, which is above the typical 7-10% benchmark.
                        Quality lead source with good fit.
                      </p>
                    </>
                  ) : selectedCohort.conversion_rate >= 0.07 ? (
                    <>
                      <p className="text-sm font-medium">✓ Average Performance</p>
                      <p className="text-sm text-muted-foreground">
                        Conversion rate is within expected range. Continue current lead generation strategy.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-red-600 font-medium">⚠ Below Benchmark</p>
                      <p className="text-sm text-muted-foreground">
                        This cohort is underperforming with {formatPercent(selectedCohort.conversion_rate)} conversion rate.
                        Review lead source quality and qualification criteria.
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Key Metrics</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Revenue per Lead: {formatCurrency(selectedCohort.revenue / selectedCohort.leads)}</li>
                  <li>• Lost Opportunities: {selectedCohort.leads - selectedCohort.conversions} leads did not convert</li>
                  <li>• Potential Impact: If conversion rate improved to 10%, would add {Math.floor(selectedCohort.leads * 0.1) - selectedCohort.conversions} deals</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Stage Detail Dialog */}
      <Dialog open={selectedStage !== null} onOpenChange={() => setSelectedStage(null)}>
        {selectedStage && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedStage.stage} Stage Details</DialogTitle>
              <DialogDescription>
                Performance metrics and insights for {selectedStage.stage}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Opportunities in Stage</div>
                  <div className="text-2xl font-bold">{selectedStage.count.toLocaleString()}</div>
                </div>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Total Value</div>
                  <div className="text-2xl font-bold">{formatCurrency(selectedStage.value, { compact: true })}</div>
                </div>
                {selectedStage.avgDealSize && (
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground mb-1">Avg Deal Size</div>
                    <div className="text-2xl font-bold">{formatCurrency(selectedStage.avgDealSize, { compact: true })}</div>
                  </div>
                )}
                {selectedStage.nextStage && selectedStage.conversionRate && (
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground mb-1">Conversion to {selectedStage.nextStage}</div>
                    <div className="text-2xl font-bold text-green-600">{formatPercent(selectedStage.conversionRate)}</div>
                  </div>
                )}
              </div>

              {lossReasons.filter(lr => lr.stage === selectedStage.stage).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Top Loss Reasons from {selectedStage.stage}</h4>
                  <div className="space-y-2">
                    {lossReasons
                      .filter(lr => lr.stage === selectedStage.stage)
                      .slice(0, 3)
                      .map((lr, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="font-medium text-sm">{lr.reason}</span>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-red-600">
                              {formatCurrency(lr.lost_value, { compact: true })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {lr.count} deals
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-semibold">Recommended Actions</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  {selectedStage.conversionRate < 0.3 && (
                    <li>Conversion rate is low - review qualification criteria and sales process</li>
                  )}
                  {selectedStage.avgDealSize < 50000 && (
                    <li>Focus on higher-value opportunities to increase average deal size</li>
                  )}
                  <li>Monitor velocity to ensure deals progress in a timely manner</li>
                  <li>Address top loss reasons to improve conversion rates</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Velocity Detail Dialog */}
      <Dialog open={selectedVelocity !== null} onOpenChange={() => setSelectedVelocity(null)}>
        {selectedVelocity && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedVelocity.from_stage} → {selectedVelocity.to_stage} Velocity</DialogTitle>
              <DialogDescription>
                Detailed timing breakdown for this stage transition
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Median Days</div>
                  <div className="text-2xl font-bold">{selectedVelocity.median_days}</div>
                  <p className="text-xs text-muted-foreground mt-1">Half of deals faster than this</p>
                </div>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Average Days</div>
                  <div className="text-2xl font-bold">{selectedVelocity.avg_days.toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Mean time to transition</p>
                </div>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">P75 Days</div>
                  <div className="text-2xl font-bold">{selectedVelocity.p75_days}</div>
                  <p className="text-xs text-muted-foreground mt-1">75th percentile benchmark</p>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="text-sm text-muted-foreground mb-1">Deals Analyzed</div>
                <div className="text-2xl font-bold">{selectedVelocity.count.toLocaleString()}</div>
              </div>

              {selectedVelocity.has_slow_deals && (
                <div className="p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-900 dark:text-yellow-400">
                        Slow Deals Detected
                      </h4>
                      <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                        Some deals in this transition are taking longer than expected. Consider reviewing
                        these opportunities to identify and address blockers.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-semibold">Timing Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">Fast track deals ({"<"}median)</span>
                    <span className="font-semibold">~50% of deals</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">Normal pace (median-P75)</span>
                    <span className="font-semibold">~25% of deals</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">Slow moving ({">"}P75)</span>
                    <span className="font-semibold">~25% of deals</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Recommended Actions</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  {selectedVelocity.has_slow_deals && (
                    <>
                      <li>Review deals exceeding P75 timeframe for potential blockers</li>
                      <li>Implement weekly check-ins for slow-moving opportunities</li>
                    </>
                  )}
                  <li>Identify patterns in fast-moving deals to replicate success</li>
                  <li>Set automated alerts for deals stalling in this stage</li>
                  <li>Coach reps on best practices to maintain healthy velocity</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Loss Reason Detail Dialog */}
      <Dialog open={selectedLossReason !== null} onOpenChange={() => setSelectedLossReason(null)}>
        {selectedLossReason && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Loss Reason: {selectedLossReason.reason}</DialogTitle>
              <DialogDescription>
                Analysis and recommendations for addressing this loss reason
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Deals Lost</div>
                  <div className="text-2xl font-bold">{selectedLossReason.count}</div>
                </div>
                <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                  <div className="text-sm text-red-800 dark:text-red-400 mb-1">Lost Value</div>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(selectedLossReason.lost_value, { compact: true })}
                  </div>
                </div>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">% of Total Losses</div>
                  <div className="text-2xl font-bold">{formatPercent(selectedLossReason.percentage)}</div>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="text-sm text-muted-foreground mb-1">Primary Stage</div>
                <Badge variant="outline" className="text-base">{selectedLossReason.stage}</Badge>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Affected Deals Analysis</h4>
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Average deal size lost:</span>
                    <span className="font-medium">
                      {formatCurrency(selectedLossReason.lost_value / selectedLossReason.count)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Impact rank:</span>
                    <span className="font-medium">
                      #{lossReasons.findIndex(lr => lr.reason === selectedLossReason.reason) + 1} of {lossReasons.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Recommendations to Address This Loss Reason</h4>
                <div className="space-y-2">
                  {selectedLossReason.reason.toLowerCase().includes('price') || selectedLossReason.reason.toLowerCase().includes('cost') ? (
                    <>
                      <div className="flex items-start gap-2 p-3 border rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-medium">Improve value communication</div>
                          <div className="text-muted-foreground">Focus on ROI and business outcomes rather than features</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-3 border rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-medium">Create pricing tiers</div>
                          <div className="text-muted-foreground">Offer flexible options to match different budget constraints</div>
                        </div>
                      </div>
                    </>
                  ) : selectedLossReason.reason.toLowerCase().includes('competitor') ? (
                    <>
                      <div className="flex items-start gap-2 p-3 border rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-medium">Develop competitive battlecards</div>
                          <div className="text-muted-foreground">Arm sales team with differentiation talking points</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-3 border rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-medium">Strengthen unique value props</div>
                          <div className="text-muted-foreground">Highlight features and benefits competitors can't match</div>
                        </div>
                      </div>
                    </>
                  ) : selectedLossReason.reason.toLowerCase().includes('timing') || selectedLossReason.reason.toLowerCase().includes('budget') ? (
                    <>
                      <div className="flex items-start gap-2 p-3 border rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-medium">Implement nurture campaigns</div>
                          <div className="text-muted-foreground">Stay engaged until timing or budget is right</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-3 border rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-medium">Qualify budget earlier</div>
                          <div className="text-muted-foreground">Improve discovery process to identify budget constraints sooner</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-2 p-3 border rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-medium">Analyze lost deal patterns</div>
                          <div className="text-muted-foreground">Interview sales reps to understand common objections</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-3 border rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-medium">Develop objection handling playbook</div>
                          <div className="text-muted-foreground">Create responses and proof points for common concerns</div>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="flex items-start gap-2 p-3 border rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium">Track improvement over time</div>
                      <div className="text-muted-foreground">Monitor if interventions reduce losses from this reason</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Potential Revenue Recovery</h4>
                <p className="text-sm text-muted-foreground">
                  If you could convert 25% of these lost deals by addressing this reason, you would recover{" "}
                  <span className="font-semibold text-green-600">
                    {formatCurrency(selectedLossReason.lost_value * 0.25, { compact: true })}
                  </span>{" "}
                  in revenue.
                </p>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Funnel Segment Detail Dialog */}
      <Dialog open={selectedFunnelSegment !== null} onOpenChange={() => setSelectedFunnelSegment(null)}>
        {selectedFunnelSegment && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedFunnelSegment.segment} Segment Analysis</DialogTitle>
              <DialogDescription>
                Detailed funnel performance by {selectedSegment.replace('_', ' ')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Total Opportunities</div>
                  <div className="text-2xl font-bold">{selectedFunnelSegment.total_opportunities}</div>
                </div>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Win Rate</div>
                  <div className="text-2xl font-bold">{formatPercent(selectedFunnelSegment.win_rate)}</div>
                </div>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Won Value</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedFunnelSegment.won_value, { compact: true })}
                  </div>
                </div>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Avg Deal Size</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(selectedFunnelSegment.avg_won_deal_size, { compact: true })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Segment Insights</h4>
                <div className="p-4 border rounded-lg space-y-2">
                  {selectedSegment === "company_size" && (
                    <>
                      {selectedFunnelSegment.segment === "Enterprise" ? (
                        <p className="text-sm text-muted-foreground">
                          Enterprise deals typically have longer sales cycles (6-12 months) but higher contract values.
                          Win rate of {formatPercent(selectedFunnelSegment.win_rate)} {selectedFunnelSegment.win_rate >= 0.15 ? "is strong" : "could be improved"} for this segment.
                        </p>
                      ) : selectedFunnelSegment.segment === "Mid-Market" ? (
                        <p className="text-sm text-muted-foreground">
                          Mid-Market deals balance deal size with sales velocity (3-6 months).
                          This segment shows {selectedFunnelSegment.win_rate >= 0.12 ? "healthy" : "below-target"} conversion with {formatPercent(selectedFunnelSegment.win_rate)} win rate.
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          SMB deals convert fastest (1-3 months) with higher volume. Win rate of {formatPercent(selectedFunnelSegment.win_rate)} {selectedFunnelSegment.win_rate >= 0.10 ? "meets expectations" : "needs improvement"}.
                        </p>
                      )}
                    </>
                  )}
                  {selectedSegment === "channel" && (
                    <p className="text-sm text-muted-foreground">
                      {selectedFunnelSegment.segment} channel is generating {formatCurrency(selectedFunnelSegment.won_value, { compact: true })} in revenue
                      with a {formatPercent(selectedFunnelSegment.win_rate)} win rate across {selectedFunnelSegment.total_opportunities} opportunities.
                    </p>
                  )}
                  {selectedSegment === "industry" && (
                    <p className="text-sm text-muted-foreground">
                      The {selectedFunnelSegment.segment} industry vertical shows a {formatPercent(selectedFunnelSegment.win_rate)} win rate.
                      Industry-specific pain points and use cases drive conversion in this segment.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Optimization Opportunities</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  {selectedFunnelSegment.win_rate < 0.10 && (
                    <li>Win rate is below 10% - review ICP fit and qualification criteria</li>
                  )}
                  {selectedFunnelSegment.avg_won_deal_size < 50000 && selectedFunnelSegment.segment !== "SMB" && (
                    <li>Average deal size is low for this segment - explore upsell opportunities</li>
                  )}
                  {selectedFunnelSegment.total_opportunities < 10 && (
                    <li>Limited opportunity volume - increase marketing investment in this segment</li>
                  )}
                  {selectedFunnelSegment.win_rate >= 0.15 && (
                    <li>Strong performance - consider this segment for increased investment</li>
                  )}
                </ul>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
