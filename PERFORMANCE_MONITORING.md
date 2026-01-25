# Performance Monitoring

## Overview

The application now includes comprehensive performance monitoring for both frontend and backend.

## Frontend Performance Monitoring

### Web Vitals Tracking

The frontend tracks Core Web Vitals automatically using Next.js built-in support:

- **LCP (Largest Contentful Paint)**: Time to render the largest content element
  - Good: ≤ 2.5s
  - Needs Improvement: 2.5s - 4.0s
  - Poor: > 4.0s

- **FID (First Input Delay)**: Time from first user interaction to browser response
  - Good: ≤ 100ms
  - Needs Improvement: 100ms - 300ms
  - Poor: > 300ms

- **CLS (Cumulative Layout Shift)**: Visual stability during page load
  - Good: ≤ 0.1
  - Needs Improvement: 0.1 - 0.25
  - Poor: > 0.25

- **FCP (First Contentful Paint)**: Time to first content render
  - Good: ≤ 1.8s
  - Needs Improvement: 1.8s - 3.0s
  - Poor: > 3.0s

- **TTFB (Time to First Byte)**: Server response time
  - Good: ≤ 800ms
  - Needs Improvement: 800ms - 1.8s
  - Poor: > 1.8s

- **INP (Interaction to Next Paint)**: Responsiveness to user interactions
  - Good: ≤ 200ms
  - Needs Improvement: 200ms - 500ms
  - Poor: > 500ms

### Viewing Metrics

**Development:**
- Metrics are logged to browser console
- Format: `📊 Performance Metric: { name, value, rating }`

**Production:**
- Configure analytics endpoint in `lib/performance.ts`
- Uncomment `navigator.sendBeacon()` to send to your analytics service

### Custom Performance Tracking

```typescript
import { markPerformance, measurePerformance, APIPerformanceTracker } from '@/lib/performance';

// Mark important events
markPerformance('data-load-start');
markPerformance('data-load-end');

// Measure duration
measurePerformance('data-load-time', 'data-load-start', 'data-load-end');

// Track API performance
const tracker = new APIPerformanceTracker('/api/summary');
// ... make API call ...
tracker.finish('success');
```

## Backend Performance Monitoring

### Request Performance Tracking

Every API request is automatically tracked with:
- Request method and path
- Response status code
- Request duration (ms)
- Timestamp

### Performance Thresholds

- **Normal**: < 2 seconds (logged as INFO)
- **Slow**: 2-5 seconds (logged as WARNING)
- **Very Slow**: > 5 seconds (logged as ERROR)

### Log Format

```
2024-01-24 10:30:45 - INFO - Request: {
  'method': 'GET',
  'path': '/api/summary',
  'status': 200,
  'duration_ms': 145.32
}
```

### Response Headers

All API responses include performance headers:
```
X-Response-Time: 145.32ms
```

### Error Tracking

Unhandled errors are automatically:
- Logged with full stack trace
- Return user-friendly error messages
- Include request path and method

## Monitoring in Production

### Recommended Integration

1. **Frontend Analytics**
   - Google Analytics 4 with Web Vitals
   - Vercel Analytics (if deployed on Vercel)
   - PostHog / Mixpanel for product analytics

2. **Backend Monitoring**
   - Application Performance Monitoring (APM):
     - DataDog
     - New Relic
     - Prometheus + Grafana
   - Log aggregation:
     - CloudWatch (AWS)
     - Stackdriver (GCP)
     - Application Insights (Azure)

3. **Database Monitoring**
   - DuckDB has built-in query profiling
   - Enable with: `PRAGMA enable_profiling;`

### Setup Example (DataDog)

**Backend:**
```python
# api/middleware.py
import ddtrace

# Add to log_request_summary():
ddtrace.tracer.trace("api.request",
    service="saas-analyzer",
    resource=f"{method} {path}",
    span_type="web"
).finish()
```

**Frontend:**
```typescript
// lib/performance.ts
import { datadogRum } from '@datadog/browser-rum';

function sendToAnalytics(metric: PerformanceMetric) {
  datadogRum.addTiming(metric.name, metric.value);
}
```

## Performance Dashboards

### Key Metrics to Track

**Frontend:**
- Average LCP by page
- 95th percentile FID
- CLS violations per session
- API call success rate
- Bundle size over time

**Backend:**
- Average response time by endpoint
- 95th percentile response time
- Error rate
- Slow query count (> 2s)
- Cache hit rate

### Alert Thresholds

**Critical:**
- API error rate > 5%
- Average response time > 3s
- LCP > 4s on 50% of page loads

**Warning:**
- API error rate > 2%
- Average response time > 2s
- LCP > 2.5s on 50% of page loads
- Slow queries > 10/hour

## Development Workflow

### Local Performance Testing

1. **Check Web Vitals:**
   ```bash
   cd frontend
   npm run dev
   # Open browser DevTools > Lighthouse
   # Run performance audit
   ```

2. **Monitor Backend Performance:**
   ```bash
   cd backend
   uvicorn api.main:app --reload
   # Watch logs for slow requests
   ```

3. **Analyze Bundle Size:**
   ```bash
   cd frontend
   npm run analyze
   # Opens bundle analysis report
   ```

### Performance Testing Checklist

- [ ] All API endpoints respond in < 2s
- [ ] No console errors in browser
- [ ] LCP < 2.5s on all pages
- [ ] CLS < 0.1 on all pages
- [ ] Bundle size reasonable (< 500KB initial load)
- [ ] Database queries use indexes
- [ ] Cache hit rate > 80% for summary endpoint

## Troubleshooting

### Slow API Requests

1. Check logs for slow query warnings
2. Use `EXPLAIN` to analyze query plans
3. Verify indexes are being used
4. Check cache configuration
5. Consider pagination for large datasets

### Poor Frontend Performance

1. Check Network tab for slow assets
2. Run Lighthouse audit
3. Verify code splitting is working
4. Check for unnecessary re-renders
5. Review bundle analysis for large dependencies

### High Error Rates

1. Check error logs for patterns
2. Verify database connection
3. Check cache availability
4. Review recent deployments
5. Monitor memory usage

## Continuous Monitoring

### Daily
- Review error logs
- Check slow query warnings

### Weekly
- Analyze Web Vitals trends
- Review top slow endpoints
- Check cache hit rates
- Monitor bundle size growth

### Monthly
- Full performance audit
- Update performance baselines
- Review and optimize slow queries
- Update monitoring dashboards

## Resources

- [Web Vitals Documentation](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [FastAPI Performance](https://fastapi.tiangolo.com/deployment/concepts/)
- [DuckDB Performance Guide](https://duckdb.org/docs/guides/performance/overview)
