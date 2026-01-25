"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

interface ComparisonBarChartProps {
  currentARR: number;
  projectedARR: number;
  label?: string;
}

export function ComparisonBarChart({
  currentARR,
  projectedARR,
  label = "Scenario Comparison",
}: ComparisonBarChartProps) {
  const delta = projectedARR - currentARR;
  const percentIncrease = ((delta / currentARR) * 100).toFixed(1);

  const data = [
    {
      name: "Current ARR",
      value: currentARR,
      fill: "#94a3b8",
      label: formatCurrency(currentARR, { compact: true }),
    },
    {
      name: "Projected ARR",
      value: projectedARR,
      fill: "#10b981",
      label: formatCurrency(projectedARR, { compact: true }),
    },
  ];

  // Custom label renderer to show value and percentage
  const renderCustomLabel = (props: any) => {
    const { x, y, width, value, index } = props;
    const isProjected = index === 1;

    return (
      <g>
        <text
          x={x + width / 2}
          y={y - 10}
          fill={isProjected ? "#10b981" : "#64748b"}
          textAnchor="middle"
          fontWeight="bold"
          fontSize="14"
        >
          {formatCurrency(value, { compact: true })}
        </text>
        {isProjected && delta > 0 && (
          <text
            x={x + width / 2}
            y={y - 28}
            fill="#10b981"
            textAnchor="middle"
            fontWeight="bold"
            fontSize="12"
          >
            ▲ +{percentIncrease}%
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="space-y-4">
      {/* Delta indicator */}
      {delta > 0 && (
        <div className="flex items-center justify-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <div className="text-sm">
            <span className="font-semibold text-green-700 dark:text-green-400">
              +{formatCurrency(delta, { compact: true })}
            </span>
            <span className="text-muted-foreground mx-2">increase</span>
            <span className="font-semibold text-green-700 dark:text-green-400">
              (+{percentIncrease}%)
            </span>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 50, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 13, fontWeight: 500 }}
          />
          <YAxis
            tickFormatter={(value) => formatCurrency(value, { compact: true })}
            domain={[0, projectedARR * 1.1]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              padding: "12px",
            }}
            formatter={(value: number, name: string, props: any) => [
              formatCurrency(value),
              props.payload.name
            ]}
          />
          <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={120}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
            <LabelList content={renderCustomLabel} />
          </Bar>

          {/* Reference line for current ARR */}
          <ReferenceLine
            y={currentARR}
            stroke="#94a3b8"
            strokeDasharray="5 5"
            label={{ value: "Baseline", position: "insideTopRight", fill: "#64748b", fontSize: 11 }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
