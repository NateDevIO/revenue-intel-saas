/**
 * Performance Monitoring Utilities
 * =================================
 *
 * Tracks Web Vitals and custom performance metrics.
 */

import { Metric } from 'web-vitals';

// Web Vitals types
export type MetricName = 'CLS' | 'FCP' | 'FID' | 'LCP' | 'TTFB' | 'INP';

interface PerformanceMetric {
  name: MetricName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

/**
 * Send performance metrics to analytics endpoint
 */
function sendToAnalytics(metric: PerformanceMetric) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Performance Metric:', {
      name: metric.name,
      value: Math.round(metric.value),
      rating: metric.rating,
    });
  }

  // In production, send to analytics service
  // Example: Google Analytics, PostHog, etc.
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // Send to your analytics endpoint
    // navigator.sendBeacon('/api/analytics', JSON.stringify(metric));
  }
}

/**
 * Report Web Vitals metrics
 */
export function reportWebVitals(metric: Metric) {
  const { name, value, rating, delta, id, navigationType } = metric;

  const performanceMetric: PerformanceMetric = {
    name: name as MetricName,
    value,
    rating: rating as 'good' | 'needs-improvement' | 'poor',
    delta,
    id,
    navigationType,
  };

  sendToAnalytics(performanceMetric);
}

/**
 * Track custom performance marks
 */
export function markPerformance(markName: string) {
  if (typeof window !== 'undefined' && window.performance) {
    window.performance.mark(markName);
  }
}

/**
 * Measure performance between two marks
 */
export function measurePerformance(
  measureName: string,
  startMark: string,
  endMark: string
) {
  if (typeof window !== 'undefined' && window.performance) {
    try {
      window.performance.measure(measureName, startMark, endMark);
      const measure = window.performance.getEntriesByName(measureName)[0];

      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ ${measureName}: ${Math.round(measure.duration)}ms`);
      }

      return measure.duration;
    } catch (error) {
      // Marks may not exist
      console.warn('Performance measurement failed:', error);
    }
  }
  return 0;
}

/**
 * Track API call performance
 */
export class APIPerformanceTracker {
  private startTime: number;
  private endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
    this.startTime = performance.now();
  }

  finish(status: 'success' | 'error') {
    const duration = performance.now() - this.startTime;

    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 API ${status}:`, {
        endpoint: this.endpoint,
        duration: Math.round(duration),
        status,
      });
    }

    // Track slow API calls
    if (duration > 2000) {
      console.warn(`⚠️ Slow API call detected: ${this.endpoint} (${Math.round(duration)}ms)`);
    }

    return duration;
  }
}

/**
 * Performance observer for long tasks
 */
export function observeLongTasks() {
  if (typeof window === 'undefined') return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          console.warn(`⚠️ Long task detected: ${Math.round(entry.duration)}ms`);
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
  } catch (error) {
    // PerformanceObserver may not be supported
    console.warn('Long task observer not supported');
  }
}

/**
 * Get Core Web Vitals thresholds
 */
export const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
} as const;

/**
 * Get performance rating
 */
export function getPerformanceRating(
  metric: MetricName,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = WEB_VITALS_THRESHOLDS[metric];

  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}
