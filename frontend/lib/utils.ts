import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency
 */
export function formatCurrency(
  value: number,
  options: { compact?: boolean; decimals?: number } = {}
): string {
  const { compact = false, decimals = 0 } = options;

  if (compact) {
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(1)}K`;
    }
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a number as percentage
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a number with compact notation
 */
export function formatNumber(
  value: number,
  options: { compact?: boolean; decimals?: number } = {}
): string {
  const { compact = false, decimals = 0 } = options;

  if (compact) {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format days as a human readable string
 */
export function formatDays(days: number): string {
  if (days < 30) {
    return `${days} days`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? "s" : ""}`;
  }
  const years = Math.floor(days / 365);
  return `${years} year${years > 1 ? "s" : ""}`;
}

/**
 * Get color for health score
 */
export function getHealthColor(
  health: "Green" | "Yellow" | "Red" | null | string
): string {
  switch (health) {
    case "Green":
      return "text-green-600 bg-green-100";
    case "Yellow":
      return "text-yellow-600 bg-yellow-100";
    case "Red":
      return "text-red-600 bg-red-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
}

/**
 * Get color for churn probability
 */
export function getChurnColor(probability: number): string {
  if (probability >= 0.7) return "text-red-600";
  if (probability >= 0.5) return "text-orange-600";
  if (probability >= 0.3) return "text-yellow-600";
  return "text-green-600";
}

/**
 * Get risk level label
 */
export function getRiskLevel(probability: number): string {
  if (probability >= 0.7) return "Critical";
  if (probability >= 0.5) return "High";
  if (probability >= 0.3) return "Medium";
  return "Low";
}

/**
 * Get effort level color
 */
export function getEffortColor(effort: "Low" | "Medium" | "High"): string {
  switch (effort) {
    case "Low":
      return "text-green-600 bg-green-100";
    case "Medium":
      return "text-yellow-600 bg-yellow-100";
    case "High":
      return "text-red-600 bg-red-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
}

/**
 * Calculate percentage change
 */
export function calculateChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return (current - previous) / previous;
}

/**
 * Generate chart colors
 */
export const CHART_COLORS = {
  primary: "hsl(221, 83%, 53%)",
  secondary: "hsl(142, 76%, 36%)",
  tertiary: "hsl(38, 92%, 50%)",
  danger: "hsl(0, 84%, 60%)",
  muted: "hsl(215, 20%, 65%)",
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  pink: "#ec4899",
  orange: "#f97316",
  teal: "#14b8a6",
};

/**
 * Funnel stage colors
 */
export const FUNNEL_COLORS: Record<string, string> = {
  Lead: "#94a3b8",
  MQL: "#3b82f6",
  SQL: "#8b5cf6",
  Opportunity: "#f97316",
  Negotiation: "#eab308",
  "Closed Won": "#22c55e",
  "Closed Lost": "#ef4444",
};

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length)}...`;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Format date for display
 */
export function formatDate(dateString: string | Date, format: 'short' | 'long' | 'relative' = 'short'): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  if (format === 'relative') {
    return formatRelativeDate(date);
  }

  if (format === 'long') {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Format date as relative time (e.g., "2 days ago", "3 months ago")
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Format date for API (YYYY-MM-DD)
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Format datetime with time
 */
export function formatDateTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
