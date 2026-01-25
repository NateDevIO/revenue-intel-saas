"use client";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface EnhancedSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max: number;
  step: number;
  unit?: string;
  description?: string;
  color?: "green" | "blue" | "purple" | "orange";
}

export function EnhancedSlider({
  label,
  value,
  onChange,
  max,
  step,
  unit = "%",
  description,
  color = "blue",
}: EnhancedSliderProps) {
  const colorClasses = {
    green: "from-green-500/20 to-green-500",
    blue: "from-blue-500/20 to-blue-500",
    purple: "from-purple-500/20 to-purple-500",
    orange: "from-orange-500/20 to-orange-500",
  };

  const textColorClasses = {
    green: "text-green-600 dark:text-green-400",
    blue: "text-blue-600 dark:text-blue-400",
    purple: "text-purple-600 dark:text-purple-400",
    orange: "text-orange-600 dark:text-orange-400",
  };

  const bgColorClasses = {
    green: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
    blue: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
    purple:
      "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800",
    orange:
      "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",
  };

  return (
    <div
      className={cn(
        "p-4 rounded-lg border transition-all duration-300",
        value > 0 ? bgColorClasses[color] : "bg-muted/30 border-muted"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <label className="font-medium">{label}</label>
        <div
          className={cn(
            "text-2xl font-bold transition-colors",
            value > 0 ? textColorClasses[color] : "text-muted-foreground"
          )}
        >
          {value}
          {unit}
        </div>
      </div>

      {/* Visual Range Indicator */}
      <div className="relative mb-3">
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full bg-gradient-to-r transition-all duration-300",
              value > 0 ? colorClasses[color] : "bg-transparent"
            )}
            style={{ width: `${(value / max) * 100}%` }}
          />
        </div>
        {/* Tick marks */}
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted-foreground">0</span>
          <span className="text-xs text-muted-foreground">{max / 2}</span>
          <span className="text-xs text-muted-foreground">{max}</span>
        </div>
      </div>

      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        max={max}
        step={step}
        className="mb-2"
      />

      {description && (
        <p className="text-sm text-muted-foreground mt-2">{description}</p>
      )}
    </div>
  );
}
