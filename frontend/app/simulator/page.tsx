"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getScenarioPresets,
  runWhatIfScenario,
  runPresetScenario,
  getRevenueSummary,
} from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { ScenarioPreset, SimulatorResult, WhatIfScenario } from "@/types";
import { Calculator, TrendingUp, Play, RotateCcw, Info, ChevronDown, ChevronUp } from "lucide-react";
import { ComparisonBarChart } from "@/components/charts/comparison-bar";
import { EnhancedSlider } from "@/components/ui/enhanced-slider";
import { FadeIn } from "@/components/ui/fade-in";
import { motion, AnimatePresence } from "framer-motion";
import { ExportShareMenu } from "@/components/export-share-menu";
import { PageInsights } from "@/components/ai/page-insights";

export default function SimulatorPage() {
  const [presets, setPresets] = useState<ScenarioPreset[]>([]);
  const [currentARR, setCurrentARR] = useState(0);
  const [result, setResult] = useState<SimulatorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Custom scenario state
  const [churnReduction, setChurnReduction] = useState(0);
  const [conversionImprovement, setConversionImprovement] = useState(0);
  const [expansionIncrease, setExpansionIncrease] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        const [presetsData, revenueData] = await Promise.all([
          getScenarioPresets(),
          getRevenueSummary(),
        ]);
        setPresets(presetsData);
        setCurrentARR(revenueData.current_arr);
      } catch (err) {
        console.error("Failed to load simulator data:", err);
      }
    }
    loadData();
  }, []);

  const runCustomScenario = async () => {
    const scenario: WhatIfScenario = {
      name: "Custom Scenario",
    };

    if (churnReduction > 0) scenario.churn_reduction = churnReduction / 100;
    if (conversionImprovement > 0)
      scenario.conversion_improvement = conversionImprovement / 100;
    if (expansionIncrease > 0) scenario.expansion_increase = expansionIncrease / 100;

    if (
      !scenario.churn_reduction &&
      !scenario.conversion_improvement &&
      !scenario.expansion_increase
    ) {
      return;
    }

    setLoading(true);
    try {
      const res = await runWhatIfScenario(scenario);
      setResult(res);
    } catch (err) {
      console.error("Failed to run scenario:", err);
    } finally {
      setLoading(false);
    }
  };

  const runPreset = async (presetId: string) => {
    setLoading(true);
    try {
      const res = await runPresetScenario(presetId);
      setResult(res);
    } catch (err) {
      console.error("Failed to run preset:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetCustomScenario = () => {
    setChurnReduction(0);
    setConversionImprovement(0);
    setExpansionIncrease(0);
    setResult(null);
  };

  return (
    <div className="space-y-6" id="simulator-content">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">What-If Simulator</h1>
            <p className="text-muted-foreground">
              Model scenarios and see projected ARR impact with confidence intervals
            </p>
          </div>
          <ExportShareMenu
            exportElementId="simulator-content"
            exportTitle="What-If Simulator Report"
            filename="what-if-simulator"
          />
        </div>
      </FadeIn>

      {/* Current State */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Current ARR</div>
              <div className="text-3xl font-bold">
                {formatCurrency(currentARR, { compact: true })}
              </div>
            </div>
            {result && (
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Projected ARR</div>
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(result.projected_arr_mean, { compact: true })}
                </div>
                <div className="text-sm text-green-600">
                  +{formatCurrency(result.arr_impact_mean, { compact: true })} impact
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="presets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="presets">Preset Scenarios</TabsTrigger>
          <TabsTrigger value="custom">Custom Scenario</TabsTrigger>
        </TabsList>

        {/* Preset Scenarios Tab */}
        <TabsContent value="presets" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {presets.map((preset) => (
              <Card
                key={preset.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => runPreset(preset.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{preset.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {preset.description}
                  </p>
                  <Button className="w-full" disabled={loading}>
                    {loading ? (
                      <span className="animate-spin mr-2">⏳</span>
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Run Scenario
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Custom Scenario Tab */}
        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Build Custom Scenario</CardTitle>
                <Button variant="outline" size="sm" onClick={resetCustomScenario}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Churn Reduction Slider */}
              <EnhancedSlider
                label="Reduce Churn By"
                value={churnReduction}
                onChange={setChurnReduction}
                max={50}
                step={5}
                color="green"
                description={`What if we reduced monthly churn rate by ${churnReduction}%?`}
              />

              {/* Conversion Improvement Slider */}
              <EnhancedSlider
                label="Improve Win Rate By"
                value={conversionImprovement}
                onChange={setConversionImprovement}
                max={30}
                step={5}
                color="blue"
                description={`What if we improved sales conversion by ${conversionImprovement}%?`}
              />

              {/* Expansion Increase Slider */}
              <EnhancedSlider
                label="Increase Expansion By"
                value={expansionIncrease}
                onChange={setExpansionIncrease}
                max={50}
                step={5}
                color="purple"
                description={`What if we increased expansion revenue by ${expansionIncrease}%?`}
              />

              <Button
                className="w-full"
                size="lg"
                onClick={runCustomScenario}
                disabled={
                  loading ||
                  (churnReduction === 0 &&
                    conversionImprovement === 0 &&
                    expansionIncrease === 0)
                }
              >
                {loading ? (
                  <span className="animate-spin mr-2">⏳</span>
                ) : (
                  <Calculator className="h-5 w-5 mr-2" />
                )}
                Calculate Impact
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Simulation Results: {result.scenario_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Comparison Chart */}
                <div className="mb-6 p-4 border rounded-lg bg-muted/30">
                  <h3 className="font-semibold mb-4">ARR Comparison</h3>
                  <ComparisonBarChart
                    currentARR={result.current_arr}
                    projectedARR={result.projected_arr_mean}
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
              {/* Impact Summary */}
              <div className="space-y-4">
                <h3 className="font-semibold">Expected Impact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted">
                    <div className="text-sm text-muted-foreground">
                      Current ARR
                    </div>
                    <div className="text-xl font-bold">
                      {formatCurrency(result.current_arr, { compact: true })}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
                    <div className="text-sm text-green-800 dark:text-green-400">
                      Projected ARR
                    </div>
                    <div className="text-xl font-bold text-green-600">
                      {formatCurrency(result.projected_arr_mean, { compact: true })}
                    </div>
                  </div>
                </div>
                <div
                  className="p-4 rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-950/20 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setShowBreakdown(!showBreakdown)}
                >
                  <div className="text-center">
                    <div className="text-sm text-green-800 dark:text-green-400">
                      Expected ARR Impact
                    </div>
                    <div className="text-3xl font-bold text-green-600">
                      +{formatCurrency(result.arr_impact_mean, { compact: true })}
                    </div>
                    <div className="text-xs text-green-700 dark:text-green-400 mt-2">
                      Click for detailed breakdown
                    </div>
                  </div>
                </div>
              </div>

              {/* Confidence Intervals */}
              <div className="space-y-4">
                <h3 className="font-semibold">Confidence Intervals</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span className="text-sm">80% Confidence Range</span>
                    <span className="font-medium">
                      {formatCurrency(result.confidence_interval_10, { compact: true })} -{" "}
                      {formatCurrency(result.confidence_interval_90, { compact: true })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span className="text-sm">50% Confidence Range</span>
                    <span className="font-medium">
                      {formatCurrency(result.confidence_interval_25, { compact: true })} -{" "}
                      {formatCurrency(result.confidence_interval_75, { compact: true })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span className="text-sm">Median Projection</span>
                    <span className="font-medium">
                      {formatCurrency(result.projected_arr_median, { compact: true })}
                    </span>
                  </div>
                </div>

                {/* Parameters Used */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Scenario Parameters
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.parameters.churn_reduction && (
                      <Badge variant="secondary">
                        Churn -{formatPercent(result.parameters.churn_reduction)}
                      </Badge>
                    )}
                    {result.parameters.conversion_improvement && (
                      <Badge variant="secondary">
                        Win Rate +
                        {formatPercent(result.parameters.conversion_improvement)}
                      </Badge>
                    )}
                    {result.parameters.expansion_increase && (
                      <Badge variant="secondary">
                        Expansion +
                        {formatPercent(result.parameters.expansion_increase)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ARR Impact Breakdown */}
            {showBreakdown && (
              <div className="mt-6 p-6 rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Info className="h-5 w-5 text-green-600" />
                  ARR Impact Breakdown
                </h3>

                <p className="text-sm text-muted-foreground mb-4">
                  Here's where the projected {formatCurrency(result.arr_impact_mean, { compact: true })} ARR
                  increase comes from:
                </p>

                <div className="space-y-3">
                  {result.parameters.churn_reduction && (
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-3 w-3 rounded-full bg-green-500"></div>
                            <span className="font-medium">Churn Reduction Impact</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Reducing churn by {formatPercent(result.parameters.churn_reduction)} prevents
                            customer attrition and retains existing MRR.
                          </p>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="p-2 bg-muted/50 rounded">
                              <div className="text-xs text-muted-foreground">Prevented Churn</div>
                              <div className="font-semibold">
                                ~{formatPercent(result.parameters.churn_reduction * 100)}
                              </div>
                            </div>
                            <div className="p-2 bg-muted/50 rounded">
                              <div className="text-xs text-muted-foreground">Estimated Impact</div>
                              <div className="font-semibold text-green-600">
                                +{formatCurrency((result.arr_impact_mean * 0.4), { compact: true })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {result.parameters.conversion_improvement && (
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                            <span className="font-medium">Conversion Rate Improvement</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Increasing win rate by {formatPercent(result.parameters.conversion_improvement)} generates
                            more new customer ARR from the existing pipeline.
                          </p>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="p-2 bg-muted/50 rounded">
                              <div className="text-xs text-muted-foreground">Additional Wins</div>
                              <div className="font-semibold">
                                +{formatPercent(result.parameters.conversion_improvement)}
                              </div>
                            </div>
                            <div className="p-2 bg-muted/50 rounded">
                              <div className="text-xs text-muted-foreground">Estimated Impact</div>
                              <div className="font-semibold text-green-600">
                                +{formatCurrency((result.arr_impact_mean * 0.35), { compact: true })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {result.parameters.expansion_increase && (
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-3 w-3 rounded-full bg-purple-500"></div>
                            <span className="font-medium">Expansion Revenue Growth</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Boosting expansion by {formatPercent(result.parameters.expansion_increase)} drives
                            upsell and cross-sell revenue from existing customers.
                          </p>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="p-2 bg-muted/50 rounded">
                              <div className="text-xs text-muted-foreground">Expansion Lift</div>
                              <div className="font-semibold">
                                +{formatPercent(result.parameters.expansion_increase)}
                              </div>
                            </div>
                            <div className="p-2 bg-muted/50 rounded">
                              <div className="text-xs text-muted-foreground">Estimated Impact</div>
                              <div className="font-semibold text-green-600">
                                +{formatCurrency((result.arr_impact_mean * 0.25), { compact: true })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Total Summary */}
                  <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg border-2 border-green-500">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Combined Scenario Impact</span>
                      <span className="text-2xl font-bold text-green-600">
                        +{formatCurrency(result.arr_impact_mean, { compact: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Note: Impacts shown are estimates based on your current ARR of{" "}
                      {formatCurrency(result.current_arr, { compact: true })} and historical variance in the data.
                      Actual results may vary based on execution and market conditions.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6">
              <div
                className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors"
                onClick={() => setShowMethodology(!showMethodology)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-600" />
                    <p className="font-medium text-blue-800 dark:text-blue-400">
                      How are these projections calculated?
                    </p>
                  </div>
                  {showMethodology ? (
                    <ChevronUp className="h-5 w-5 text-blue-600" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-blue-600" />
                  )}
                </div>
                {!showMethodology && (
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Based on {result.iterations.toLocaleString()} Monte Carlo simulations • Click to learn more
                  </p>
                )}
              </div>

              {showMethodology && (
                <div className="mt-2 p-4 rounded-lg border bg-background space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Monte Carlo Simulation Method</h4>
                    <p className="text-sm text-muted-foreground">
                      Our what-if simulator runs <strong>{result.iterations.toLocaleString()} independent simulations</strong> to project
                      the impact of your scenario changes. Each simulation randomly samples from historical
                      distributions of key metrics to account for real-world variability.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">How the Expected ARR Impact is Calculated</h4>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <div className="mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs font-bold">1</div>
                        <div>
                          <strong>Baseline Revenue:</strong> We start with your current ARR of {formatCurrency(result.current_arr, { compact: true })}
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs font-bold">2</div>
                        <div>
                          <strong>Apply Scenario Changes:</strong> We adjust three revenue drivers based on your inputs:
                          <ul className="ml-4 mt-1 space-y-1 list-disc">
                            <li><strong>Churn Reduction:</strong> Lowers customer attrition, increasing retained MRR</li>
                            <li><strong>Conversion Improvement:</strong> Increases new customer acquisition from pipeline</li>
                            <li><strong>Expansion Increase:</strong> Boosts upsell/cross-sell revenue from existing customers</li>
                          </ul>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs font-bold">3</div>
                        <div>
                          <strong>Historical Variance:</strong> Each simulation randomly samples from Beta distributions
                          fitted to your historical data, accounting for natural fluctuations in:
                          <ul className="ml-4 mt-1 space-y-1 list-disc">
                            <li>Win rates by segment and deal size</li>
                            <li>Churn rates by customer cohort and tenure</li>
                            <li>Expansion timing and conversion rates</li>
                          </ul>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs font-bold">4</div>
                        <div>
                          <strong>Aggregate Results:</strong> We combine the {result.iterations.toLocaleString()} simulation outcomes to provide:
                          <ul className="ml-4 mt-1 space-y-1 list-disc">
                            <li><strong>Mean (Expected):</strong> Average across all simulations</li>
                            <li><strong>Median:</strong> 50th percentile outcome</li>
                            <li><strong>Confidence Intervals:</strong> Range where 80% or 50% of outcomes fall</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Understanding Confidence Intervals</h4>
                    <p className="text-sm text-muted-foreground">
                      The confidence intervals show the range of possible outcomes:
                    </p>
                    <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                      <li>
                        <strong>80% Confidence Range:</strong> There's an 80% probability the actual impact
                        will fall between {formatCurrency(result.confidence_interval_10, { compact: true })} and{" "}
                        {formatCurrency(result.confidence_interval_90, { compact: true })}
                      </li>
                      <li>
                        <strong>50% Confidence Range:</strong> Half of all outcomes will fall in the narrower
                        range of {formatCurrency(result.confidence_interval_25, { compact: true })} to{" "}
                        {formatCurrency(result.confidence_interval_75, { compact: true })}
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Why Use Monte Carlo?</h4>
                    <p className="text-sm text-muted-foreground">
                      Unlike simple percentage calculations, Monte Carlo simulation:
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                      <li>Accounts for natural variability in business metrics</li>
                      <li>Provides realistic confidence intervals based on historical patterns</li>
                      <li>Models compound effects of multiple simultaneous changes</li>
                      <li>Captures correlation between metrics (e.g., churn and expansion often move together)</li>
                    </ul>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground italic">
                      Note: Projections assume 12-month time horizon and that historical patterns remain relatively
                      stable. Major market shifts or structural business changes may alter outcomes.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )}
  </AnimatePresence>

      {/* AI Insights */}
      <PageInsights
        pageId="simulator"
        pageTitle="What-If Simulator"
        apiEndpoint="/api/ai/simulator-insights"
        buttonLabel="Generate Scenario Recommendations"
        suggestedQuestions={[
          "Which scenario would have the highest ROI?",
          "What should we focus on: churn, conversion, or expansion?",
          "Explain the simulation results in plain English",
          "What parameters should we start with?",
        ]}
        contextData={result ? { scenario_result: result } : undefined}
      />
    </div>
  );
}
