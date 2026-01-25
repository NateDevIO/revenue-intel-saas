# Methodology Documentation

This document describes the analytical methodologies used in the SaaS Revenue Lifecycle Analyzer.

## Table of Contents

1. [Data Generation](#data-generation)
2. [Funnel Analytics](#funnel-analytics)
3. [Churn Prediction](#churn-prediction)
4. [Health Scoring](#health-scoring)
5. [Revenue Intelligence](#revenue-intelligence)
6. [What-If Simulation](#what-if-simulation)

---

## Data Generation

### Overview

The platform uses synthetic data that mimics realistic B2B SaaS patterns. This enables demonstration and testing without requiring actual customer data.

### Key Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Time period | 24 months | Sufficient for cohort analysis |
| Base leads/month | 750 | Typical mid-market SaaS |
| Segments | SMB, Mid-Market, Enterprise | Standard B2B segmentation |
| Channels | 7 (Organic, Paid, Content, Referral, Events, Outbound, Partner) | Diverse acquisition mix |

### Realistic Patterns

1. **Seasonality**: Lead volume varies by month (Q1 push, summer slowdown, Q4 close)
2. **Segment Variation**: SMB converts faster but churns more; Enterprise is opposite
3. **Usage-Churn Correlation**: Declining usage precedes churn
4. **Rep Performance Variation**: ±20% standard deviation from baseline

### Documented Assumptions

All assumptions are stored in `backend/data/assumptions.py` and can be modified to simulate different business scenarios.

---

## Funnel Analytics

### Conversion Rate Calculation

**Count-Based Conversion**:
```
Conversion Rate = (Opportunities reaching Stage N+1) / (Opportunities reaching Stage N)
```

**Dollar-Weighted Conversion**:
```
Dollar Conversion = (Total Value reaching Stage N+1) / (Total Value reaching Stage N)
```

Dollar-weighted conversion accounts for deal size, providing a more accurate revenue picture.

### Velocity Metrics

- **Median Days**: Primary metric (resistant to outliers)
- **P75 Days**: Identifies the "long tail" of slow deals
- **Slow Deal Flag**: Triggered when P75 > Median × 1.8

### Cohort Analysis

Leads are grouped by acquisition week/month to track:
- Conversion rate over time
- Revenue per cohort
- Deal size trends

### Rep Performance Controls

Basic rep metrics are adjusted for segment mix using weighted comparisons:
```
Performance vs Team = Rep Win Rate / Segment-Weighted Team Win Rate
```

---

## Churn Prediction

### Model Architecture

**Algorithm**: XGBoost Classifier
- Handles mixed feature types well
- Native handling of missing values
- Good performance on tabular data

### Features

| Feature | Type | Description |
|---------|------|-------------|
| tenure_days | Numeric | Days since customer start |
| initial_mrr | Numeric | Starting MRR |
| current_mrr | Numeric | Current MRR |
| avg_logins_30d | Numeric | Average daily logins (30-day) |
| avg_api_calls_30d | Numeric | Average daily API calls |
| usage_trend | Numeric | (Recent - Prior) / Prior login ratio |
| mrr_change | Numeric | (Current - Initial) / Initial |
| latest_nps_score | Numeric | Most recent NPS (0-10) |
| company_size | Categorical | SMB/Mid-Market/Enterprise |
| industry | Categorical | Industry vertical |
| channel | Categorical | Acquisition channel |

### Time-Based Validation

To prevent data leakage:
```
Training:   Months 1-18
Validation: Months 19-21
Testing:    Months 22-24
```

### Probability Calibration

Raw XGBoost probabilities are calibrated using Platt Scaling:
```python
CalibratedClassifierCV(model, method='sigmoid', cv=5)
```

### Threshold Optimization

The classification threshold is optimized to maximize business value:
```
Net Value = (Saved ARR × Churn Prob × Save Rate) - Intervention Cost
```

Default parameters:
- Intervention Cost: $500
- Save Rate: 30%

---

## Health Scoring

### Component Weights

| Component | Weight | Description |
|-----------|--------|-------------|
| Usage | 35% | Product usage vs segment benchmark |
| Engagement | 25% | Login frequency and recency |
| Sentiment | 20% | NPS score and trends |
| Financial | 20% | MRR changes, expansion history |

### Usage Score Calculation

```
Login Score = min(100, (Avg Logins / Segment Benchmark) × 50)
API Score = min(100, (Avg API Calls / Segment Benchmark) × 50)
Usage Score = (Login Score + API Score) / 2
```

### Health Categories

| Category | Score Range | Typical Churn Prob |
|----------|-------------|-------------------|
| Green | ≥70 | 5-15% |
| Yellow | 40-69 | 25-45% |
| Red | <40 | 55-85% |

---

## Revenue Intelligence

### LTV Calculation

**Method**: Cohort-based survival analysis

```python
LTV = Average MRR × Estimated Lifetime (months)
```

Where Estimated Lifetime is derived from:
1. Historical cohort retention curves
2. Segment-specific adjustments
3. Conservative cap at 36 months

### CAC Calculation

```
CAC = Total Marketing Spend / Customers Acquired
```

Segment-specific CAC applies multipliers:
- SMB: 0.6×
- Mid-Market: 1.0×
- Enterprise: 2.0×

### Net Revenue Retention

```
NRR = (Ending MRR from Cohort) / (Starting MRR of Cohort)
```

Calculated on a 12-month basis using customers active at the start of the period.

### Revenue at Risk

```
ARR at Risk = Σ (Customer ARR × Churn Probability)
```

Summed across all active customers.

---

## What-If Simulation

### Monte Carlo Methodology

1. **Define Parameters**: Churn reduction, conversion improvement, expansion increase
2. **Add Uncertainty**: Each parameter varies ±30% using triangular distribution
3. **Run Iterations**: 1,000 simulations (default)
4. **Calculate Confidence Intervals**: 10th, 25th, 75th, 90th percentiles

### Example Calculation

For "Reduce Churn by 10%":
```python
for iteration in range(1000):
    actual_reduction = target_reduction * random.triangular(0.7, 1.0, 1.3)
    churn_arr_saved = annual_churn_mrr × actual_reduction
    projected_arr = current_arr + churn_arr_saved
    results.append(projected_arr)
```

### Confidence Interpretation

- **80% Confidence Interval** (10th-90th percentile): Most likely range of outcomes
- **50% Confidence Interval** (25th-75th percentile): More probable range

### Limitations

1. Assumes historical patterns continue
2. Does not account for competitive dynamics
3. Linear extrapolation of improvements
4. No interaction effects between parameters

---

## Industry Benchmarks

Source: Publicly available SaaS benchmarks (KeyBanc, OpenView, etc.)

| Metric | Bottom Quartile | Median | Top Quartile |
|--------|-----------------|--------|--------------|
| NRR | 90% | 105% | 120% |
| LTV:CAC | 2.0x | 3.0x | 5.0x |
| Payback (months) | 18 | 12 | 8 |
| Monthly Churn | 4.0% | 2.0% | 1.0% |

---

## Appendix: Statistical Notes

### Feature Importance

Feature importance is calculated using:
1. **XGBoost Gain**: Average gain in objective function when feature is used
2. **SHAP Values**: Shapley additive explanations for individual predictions

### Confidence Interval Calculation

```python
ci_10 = np.percentile(results, 10)
ci_90 = np.percentile(results, 90)
```

### Expected Calibration Error

```python
ECE = Σ |bin_accuracy - bin_confidence| × bin_weight
```

Used to verify probability calibration quality.

---

*Last updated: January 2025*
