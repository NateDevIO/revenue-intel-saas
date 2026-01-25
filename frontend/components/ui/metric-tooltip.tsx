"use client"

import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip"

interface MetricTooltipProps {
  metric: string
  description?: string
  formula?: string
}

const METRIC_DEFINITIONS: Record<string, { description: string; formula?: string }> = {
  ARR: {
    description: "Annual Recurring Revenue - The value of recurring revenue normalized to a one-year period",
    formula: "MRR × 12",
  },
  MRR: {
    description: "Monthly Recurring Revenue - Predictable revenue generated each month from subscriptions",
  },
  NRR: {
    description: "Net Revenue Retention - Measures revenue retention from existing customers including expansions and contractions",
    formula: "(Starting MRR + Expansion - Contraction - Churn) / Starting MRR",
  },
  LTV: {
    description: "Lifetime Value - The predicted net profit from the entire future relationship with a customer",
    formula: "Avg MRR × Gross Margin % ÷ Churn Rate",
  },
  CAC: {
    description: "Customer Acquisition Cost - The total cost of acquiring a new customer",
    formula: "Total Sales & Marketing Spend / New Customers Acquired",
  },
  "LTV:CAC": {
    description: "Lifetime Value to Customer Acquisition Cost Ratio - Measures return on investment for acquiring customers. Should be > 3:1",
    formula: "LTV / CAC",
  },
  "Churn Rate": {
    description: "The percentage of customers who cancel their subscription in a given period",
    formula: "Churned Customers / Total Customers at Start",
  },
  "Churn Probability": {
    description: "The predicted likelihood that a customer will churn based on usage, engagement, and other factors",
  },
  "Health Score": {
    description: "A composite score (0-100) measuring customer health based on usage, engagement, sentiment, and financial metrics",
  },
  "Payback Period": {
    description: "The time it takes to recover the cost of acquiring a customer",
    formula: "CAC / Monthly Gross Margin per Customer",
  },
}

export function MetricTooltip({ metric, description, formula }: MetricTooltipProps) {
  const def = METRIC_DEFINITIONS[metric]
  const finalDescription = description || def?.description
  const finalFormula = formula || def?.formula

  if (!finalDescription) return null

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors ml-1" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1.5">
            <p className="text-sm">{finalDescription}</p>
            {finalFormula && (
              <p className="text-xs font-mono text-muted-foreground border-t pt-1.5">
                {finalFormula}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
