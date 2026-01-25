"use client";

import { useMemo } from "react";

interface FunnelChartProps {
  data: Array<{
    stage: string;
    count: number;
    value: number;
    conversion_rate?: number;
  }>;
}

export function FunnelChart({ data }: FunnelChartProps) {
  const maxCount = useMemo(() => Math.max(...data.map((d) => d.count)), [data]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const getColor = (index: number) => {
    const colors = [
      "#3b82f6", // Blue
      "#8b5cf6", // Purple
      "#ec4899", // Pink
      "#f59e0b", // Orange
      "#10b981", // Green
      "#06b6d4", // Cyan
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="w-full">
      {/* Funnel visualization */}
      <div className="space-y-3">
        {data.map((stage, index) => {
          const widthPercentage = (stage.count / maxCount) * 100;
          const leftMargin = (100 - widthPercentage) / 2;

          return (
            <div key={stage.stage} className="relative">
              {/* Stage bar */}
              <div
                className="mx-auto transition-all duration-300 hover:scale-105 cursor-pointer"
                style={{
                  width: `${widthPercentage}%`,
                  minWidth: "40%",
                }}
              >
                <div
                  className="rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow"
                  style={{
                    background: `linear-gradient(135deg, ${getColor(
                      index
                    )} 0%, ${getColor(index)}dd 100%)`,
                  }}
                >
                  <div className="flex items-center justify-between text-white">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{stage.stage}</div>
                      <div className="text-xs opacity-90 mt-0.5">
                        {stage.count.toLocaleString()} opportunities
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {formatCurrency(stage.value)}
                      </div>
                      {stage.conversion_rate !== undefined && (
                        <div className="text-xs opacity-90 mt-0.5">
                          {(stage.conversion_rate * 100).toFixed(1)}% conversion
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Connecting line/arrow */}
              {index < data.length - 1 && (
                <div className="flex justify-center my-2">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-gray-400"
                  >
                    <path
                      d="M12 5v14m0 0l-4-4m4 4l4-4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary stats */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-600 mb-1">Total Opportunities</div>
          <div className="text-2xl font-bold text-blue-600">
            {data[0]?.count.toLocaleString() || 0}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-600 mb-1">Won</div>
          <div className="text-2xl font-bold text-green-600">
            {data[data.length - 1]?.count.toLocaleString() || 0}
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-600 mb-1">Overall Conversion</div>
          <div className="text-2xl font-bold text-purple-600">
            {data.length > 0
              ? (
                  ((data[data.length - 1]?.count || 0) / (data[0]?.count || 1)) *
                  100
                ).toFixed(1)
              : 0}
            %
          </div>
        </div>
      </div>

      {/* Drop-off analysis */}
      {data.length > 1 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Stage Drop-off Analysis
          </h4>
          <div className="space-y-2">
            {data.slice(0, -1).map((stage, index) => {
              const nextStage = data[index + 1];
              const dropOff = stage.count - nextStage.count;
              const dropOffPercentage = (dropOff / stage.count) * 100;

              return (
                <div
                  key={stage.stage}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-700">
                    {stage.stage} → {nextStage.stage}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600">
                      Lost: {dropOff.toLocaleString()}
                    </span>
                    <span className="font-semibold text-red-600 min-w-[60px] text-right">
                      -{dropOffPercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
