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
} from "recharts";

interface ChurnDistributionProps {
  data: Array<{
    range: string;
    count: number;
    arr_at_risk: number;
  }>;
}

export function ChurnDistributionChart({ data }: ChurnDistributionProps) {
  // Color code based on risk level
  const getColor = (range: string) => {
    if (range.includes("0-20")) return "#10b981"; // Low risk - green
    if (range.includes("20-40")) return "#3b82f6"; // Medium-low - blue
    if (range.includes("40-60")) return "#f59e0b"; // Medium-high - orange
    if (range.includes("60-80")) return "#f97316"; // High - dark orange
    return "#ef4444"; // Very high - red
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">
            Churn Risk: {payload[0].payload.range}%
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Customers:</span>
              <span className="font-semibold">
                {payload[0].value.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">ARR at Risk:</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(payload[0].payload.arr_at_risk)}
              </span>
            </div>
          </div>
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
            data={data}
            margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="range"
              label={{
                value: "Churn Probability (%)",
                position: "insideBottom",
                offset: -5,
                style: { fontSize: "12px", fontWeight: 600 },
              }}
              style={{ fontSize: "11px" }}
              angle={0}
              textAnchor="middle"
              height={50}
              interval={0}
            />
            <YAxis
              label={{
                value: "Number of Customers",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: "12px", fontWeight: 600 },
              }}
              style={{ fontSize: "12px" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.range)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Risk legend */}
      <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs pb-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ background: "#10b981" }} />
          <span>Low Risk (0-20%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ background: "#3b82f6" }} />
          <span>Medium-Low (20-40%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ background: "#f59e0b" }} />
          <span>Medium-High (40-60%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ background: "#f97316" }} />
          <span>High (60-80%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ background: "#ef4444" }} />
          <span>Very High (80-100%)</span>
        </div>
      </div>
    </div>
  );
}
