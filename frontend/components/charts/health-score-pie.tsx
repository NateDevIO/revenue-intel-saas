"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface HealthScorePieProps {
  data: {
    healthy: number;
    at_risk: number;
    critical: number;
  };
}

const COLORS = {
  healthy: "#10b981",
  at_risk: "#f59e0b",
  critical: "#ef4444",
};

export function HealthScorePieChart({ data }: HealthScorePieProps) {
  const chartData = [
    { name: "Healthy (>70)", value: data.healthy, color: COLORS.healthy },
    { name: "At Risk (40-70)", value: data.at_risk, color: COLORS.at_risk },
    { name: "Critical (<40)", value: data.critical, color: COLORS.critical },
  ];

  const total = data.healthy + data.at_risk + data.critical;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const percentage = ((payload[0].value / total) * 100).toFixed(1);
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{payload[0].name}</p>
          <p className="text-sm text-gray-600">
            Customers: {payload[0].value.toLocaleString()}
          </p>
          <p className="text-sm font-medium text-gray-900">
            {percentage}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

    if (percent < 0.05) return null; // Don't show label if slice is too small

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="font-semibold text-sm"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={130}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        {chartData.map((item) => (
          <div key={item.name} className="flex flex-col items-center">
            <div
              className="w-4 h-4 rounded-full mb-1"
              style={{ background: item.color }}
            />
            <div className="text-xs text-gray-600">{item.name.split(" ")[0]}</div>
            <div className="text-lg font-bold">{item.value.toLocaleString()}</div>
            <div className="text-xs text-gray-500">
              {((item.value / total) * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
