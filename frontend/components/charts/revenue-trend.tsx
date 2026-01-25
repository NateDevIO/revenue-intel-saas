"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

interface RevenueTrendProps {
  data: Array<{
    month: string;
    mrr: number;
    arr: number;
  }>;
}

export function RevenueTrendChart({ data }: RevenueTrendProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: entry.color }}
                />
                <span className="text-sm text-gray-600">{entry.name}:</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorMRR" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorARR" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
            style={{ fontSize: "12px" }}
            tickMargin={10}
          />
          <YAxis
            tickFormatter={formatCurrency}
            style={{ fontSize: "12px" }}
            tickMargin={10}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="circle"
          />
          <Area
            type="monotone"
            dataKey="mrr"
            name="MRR"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorMRR)"
          />
          <Area
            type="monotone"
            dataKey="arr"
            name="ARR"
            stroke="#8b5cf6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorARR)"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Growth indicators */}
      {data.length >= 2 && (
        <div className="mt-4 flex justify-center gap-8 text-sm">
          {(() => {
            const firstMRR = data[0].mrr;
            const lastMRR = data[data.length - 1].mrr;
            const growth = ((lastMRR - firstMRR) / firstMRR) * 100;
            const isPositive = growth >= 0;

            return (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">MRR Growth:</span>
                <span
                  className={`font-semibold ${
                    isPositive ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isPositive ? "↑" : "↓"} {Math.abs(growth).toFixed(1)}%
                </span>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
