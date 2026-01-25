"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  className?: string;
  valueClassName?: string;
  onClick?: () => void;
  clickable?: boolean;
}

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  icon,
  className,
  valueClassName,
  onClick,
  clickable = false,
}: KPICardProps) {
  const getTrendIcon = () => {
    if (trend === undefined || trend === 0) {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
    if (trend > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getTrendColor = () => {
    if (trend === undefined || trend === 0) return "text-muted-foreground";
    return trend > 0 ? "text-green-600" : "text-red-600";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={clickable ? { scale: 1.02, transition: { duration: 0.2 } } : {}}
      whileTap={clickable ? { scale: 0.98 } : {}}
    >
      <Card
        className={cn(
          "",
          clickable && "cursor-pointer hover:shadow-lg transition-shadow",
          className
        )}
        onClick={clickable ? onClick : undefined}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", valueClassName)}>{value}</div>
          {(subtitle || trend !== undefined) && (
            <div className="flex items-center gap-2 mt-1">
              {trend !== undefined && (
                <>
                  {getTrendIcon()}
                  <span className={cn("text-xs font-medium", getTrendColor())}>
                    {trend > 0 ? "+" : ""}
                    {(trend * 100).toFixed(1)}%
                  </span>
                </>
              )}
              {subtitle && (
                <span className="text-xs text-muted-foreground">{subtitle}</span>
              )}
              {trendLabel && (
                <span className="text-xs text-muted-foreground">
                  {trendLabel}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
