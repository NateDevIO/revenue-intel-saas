"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface MRRWaterfallProps {
  data: {
    starting_mrr: number;
    new_mrr: number;
    expansion_mrr: number;
    contraction_mrr: number;
    churned_mrr: number;
    ending_mrr: number;
  };
}

export function MRRWaterfallChart({ data }: MRRWaterfallProps) {
  // Transform data into waterfall format
  const waterfallData = [
    {
      name: "Starting MRR",
      value: data.starting_mrr,
      displayValue: data.starting_mrr,
      fill: "#64748b",
    },
    {
      name: "New MRR",
      value: data.new_mrr,
      displayValue: data.starting_mrr + data.new_mrr,
      fill: "#10b981",
    },
    {
      name: "Expansion",
      value: data.expansion_mrr,
      displayValue: data.starting_mrr + data.new_mrr + data.expansion_mrr,
      fill: "#3b82f6",
    },
    {
      name: "Contraction",
      value: -data.contraction_mrr,
      displayValue:
        data.starting_mrr +
        data.new_mrr +
        data.expansion_mrr -
        data.contraction_mrr,
      fill: "#f59e0b",
    },
    {
      name: "Churn",
      value: -data.churned_mrr,
      displayValue: data.ending_mrr,
      fill: "#ef4444",
    },
    {
      name: "Ending MRR",
      value: data.ending_mrr,
      displayValue: data.ending_mrr,
      fill: "#8b5cf6",
    },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(value));
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{payload[0].payload.name}</p>
          <p className="text-sm text-gray-600">
            Change: {formatCurrency(payload[0].payload.value)}
          </p>
          <p className="text-sm font-medium text-gray-900">
            Total: {formatCurrency(payload[0].payload.displayValue)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={waterfallData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              angle={0}
              textAnchor="middle"
              height={60}
              interval={0}
              style={{ fontSize: "11px" }}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value)}
              style={{ fontSize: "12px" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {waterfallData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs pb-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ background: "#10b981" }} />
          <span>New MRR</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ background: "#3b82f6" }} />
          <span>Expansion</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ background: "#f59e0b" }} />
          <span>Contraction</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ background: "#ef4444" }} />
          <span>Churn</span>
        </div>
      </div>
    </div>
  );
}
