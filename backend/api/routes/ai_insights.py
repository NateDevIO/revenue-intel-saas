from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import json
import time
from typing import Optional, Dict, Any
from anthropic import Anthropic
from data.database import get_connection
from analysis import (
    get_revenue_summary,
    get_churn_summary,
    get_funnel_summary,
    get_health_distribution,
    get_action_priority_matrix,
    get_revenue_leakage_analysis,
    get_stage_conversion_rates,
    get_velocity_metrics,
    get_loss_reasons,
    get_rep_performance,
    get_mrr_waterfall,
    get_nrr_trend,
    get_ltv_cac_summary,
    get_at_risk_customers,
)

router = APIRouter()

# ============================================================================
# Model Auto-Discovery
# ============================================================================

_cached_model: Optional[str] = None
_cache_expiry: float = 0
_CACHE_TTL = 24 * 60 * 60  # 24 hours


def _get_latest_sonnet_model(client: Anthropic) -> str:
    """Auto-discover the latest Sonnet model, cached for 24 hours."""
    global _cached_model, _cache_expiry

    if _cached_model and time.time() < _cache_expiry:
        return _cached_model

    try:
        models = client.models.list()
        sonnet_models = sorted(
            [m for m in models.data if "sonnet" in m.id and "latest" not in m.id],
            key=lambda m: m.created_at,
            reverse=True,
        )
        if sonnet_models:
            _cached_model = sonnet_models[0].id
            _cache_expiry = time.time() + _CACHE_TTL
            return _cached_model
    except Exception as e:
        print(f"Model discovery failed, using fallback: {e}")

    return _cached_model or "claude-sonnet-4-6-latest"


# ============================================================================
# Shared Helpers
# ============================================================================

def _get_api_key() -> str:
    """Get Anthropic API key from environment or raise."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY environment variable not set. Please configure your Claude API key."
        )
    return api_key


def _call_claude(system_prompt: str, user_message: str, api_key: str) -> Dict[str, str]:
    """Call Claude API and return insight text + model name."""
    try:
        client = Anthropic(api_key=api_key)
        model = os.getenv("CLAUDE_MODEL") or _get_latest_sonnet_model(client)
        message = client.messages.create(
            model=model,
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}]
        )
        return {
            "insight": message.content[0].text,
            "model": message.model,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error calling Claude API: {str(e)}"
        )


def _format_dict(data: Any, indent: int = 0) -> str:
    """Format a dict/list for inclusion in a prompt context block."""
    return json.dumps(data, indent=2, default=str)


# ============================================================================
# Request / Response Models
# ============================================================================

class AIInsightRequest(BaseModel):
    customer_id: str
    question: Optional[str] = None

class AIInsightResponse(BaseModel):
    customer_id: str
    customer_name: str
    insight: str
    model: str

class PageInsightRequest(BaseModel):
    question: Optional[str] = None
    context_data: Optional[Dict[str, Any]] = None

class PageInsightResponse(BaseModel):
    page_id: str
    insight: str
    model: str


# ============================================================================
# Existing Customer Insights Endpoint
# ============================================================================

@router.post("/customer-insights", response_model=AIInsightResponse)
async def get_customer_insights(request: AIInsightRequest):
    """
    Generate AI-powered insights about a specific customer using Claude API.
    """
    api_key = _get_api_key()

    conn = get_connection()

    try:
        return await _generate_insights(conn, request, api_key)
    finally:
        conn.close()


async def _generate_insights(conn, request, api_key):
    """Generate insights using customer data and Claude API."""
    # Gather comprehensive customer data
    customer_query = """
        SELECT
            customer_id,
            company_name,
            company_size,
            industry,
            channel,
            status,
            current_mrr,
            health_score,
            churn_probability,
            start_date,
            churn_date,
            DATEDIFF('day', start_date, COALESCE(churn_date, CURRENT_DATE)) as tenure_days
        FROM customers
        WHERE customer_id = ?
    """

    customer_data = conn.execute(customer_query, (request.customer_id,)).fetchone()

    if not customer_data:
        raise HTTPException(status_code=404, detail=f"Customer {request.customer_id} not found")

    # Get usage events summary
    usage_query = """
        SELECT
            COUNT(*) as total_events,
            AVG(logins) as avg_logins,
            AVG(api_calls) as avg_api_calls,
            AVG(reports_generated) as avg_reports,
            AVG(team_members_active) as avg_active_users
        FROM usage_events
        WHERE customer_id = ?
        AND event_date >= CURRENT_DATE - INTERVAL '30 days'
    """

    usage_data = conn.execute(usage_query, (request.customer_id,)).fetchone()

    # Get latest NPS score
    nps_query = """
        SELECT score, response_text
        FROM nps_surveys
        WHERE customer_id = ?
        ORDER BY survey_date DESC
        LIMIT 1
    """

    nps_data = conn.execute(nps_query, (request.customer_id,)).fetchone()

    # Get MRR trend
    mrr_query = """
        SELECT
            SUM(CASE WHEN movement_type = 'expansion' THEN amount ELSE 0 END) as expansion_mrr,
            SUM(CASE WHEN movement_type = 'contraction' THEN amount ELSE 0 END) as contraction_mrr
        FROM mrr_movements
        WHERE customer_id = ?
        AND movement_date >= CURRENT_DATE - INTERVAL '90 days'
    """

    mrr_trend = conn.execute(mrr_query, (request.customer_id,)).fetchone()

    # Build context for Claude
    context = f"""
Customer Profile:
- Company: {customer_data[1]}
- Industry: {customer_data[3]}
- Size: {customer_data[2]}
- Acquisition Channel: {customer_data[4]}
- Status: {customer_data[5]}
- Tenure: {customer_data[11]} days

Financial Metrics:
- Current MRR: ${customer_data[6]:,.2f}
- Expansion MRR (90d): ${mrr_trend[0] or 0:,.2f}
- Contraction MRR (90d): ${mrr_trend[1] or 0:,.2f}

Health & Risk:
- Health Score: {customer_data[7]}
- Churn Probability: {customer_data[8]:.1%}

Engagement (Last 30 days):
- Average Daily Logins: {usage_data[1] or 0:.1f}
- Average API Calls: {usage_data[2] or 0:.1f}
- Reports Generated: {usage_data[3] or 0:.1f}
- Active Users: {usage_data[4] or 0:.1f}

Customer Sentiment:
- Latest NPS Score: {nps_data[0] if nps_data else 'N/A'} ({get_nps_category(nps_data[0]) if nps_data else 'No feedback'})
{f"- Feedback: {nps_data[1]}" if nps_data and nps_data[1] else ""}
"""

    # Determine the prompt based on whether a specific question was asked
    if request.question:
        system_prompt = """You are an expert SaaS Customer Success analyst. Analyze the customer data provided and answer the specific question asked. Be concise, actionable, and data-driven in your response."""
        user_message = f"{context}\n\nQuestion: {request.question}\n\nProvide a clear, concise answer based on the customer data above."
    else:
        system_prompt = """You are an expert SaaS Customer Success analyst. Analyze customer data and provide actionable insights. Focus on:
1. Current health status and risk level
2. Key trends (positive and negative)
3. Specific recommended actions
4. Potential intervention strategies

Be concise, specific, and actionable. Quantify impact where possible."""

        user_message = f"{context}\n\nProvide a comprehensive analysis of this customer's health and specific recommendations for the Customer Success team."

    result = _call_claude(system_prompt, user_message, api_key)

    return AIInsightResponse(
        customer_id=request.customer_id,
        customer_name=customer_data[1],
        insight=result["insight"],
        model=result["model"],
    )


# ============================================================================
# Page-Level AI Insight Endpoints
# ============================================================================

@router.post("/executive-insights", response_model=PageInsightResponse)
async def get_executive_insights(request: PageInsightRequest):
    """Generate AI insights for the Executive Dashboard."""
    api_key = _get_api_key()

    try:
        revenue = get_revenue_summary()
        churn = get_churn_summary()
        funnel = get_funnel_summary()
        health = get_health_distribution()
        actions = get_action_priority_matrix()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error gathering data: {str(e)}")

    context = f"""Executive Dashboard Data:

Revenue Summary:
{_format_dict(revenue)}

Churn Summary:
{_format_dict(churn)}

Funnel Summary:
{_format_dict(funnel)}

Health Distribution:
{_format_dict(health)}

Top Prioritized Actions:
{_format_dict(actions[:5] if isinstance(actions, list) else actions)}
"""

    if request.question:
        system_prompt = """You are an expert SaaS business strategist reviewing an executive dashboard. Answer the specific question using the data provided. Be concise, data-driven, and actionable."""
        user_message = f"{context}\n\nQuestion: {request.question}"
    else:
        system_prompt = """You are an expert SaaS business strategist. Analyze the executive dashboard data and provide a Monday morning briefing. Focus on:
1. Overall business health narrative (1-2 sentences)
2. Key anomalies or trends requiring attention
3. Top 3 priorities for the week with expected impact
4. One metric that deserves deeper investigation

Be concise, specific, and action-oriented. Use numbers from the data."""
        user_message = f"{context}\n\nProvide your executive briefing based on this data."

    result = _call_claude(system_prompt, user_message, api_key)

    return PageInsightResponse(
        page_id="executive",
        insight=result["insight"],
        model=result["model"],
    )


@router.post("/risk-insights", response_model=PageInsightResponse)
async def get_risk_insights(request: PageInsightRequest):
    """Generate AI insights for the Revenue at Risk page."""
    api_key = _get_api_key()

    try:
        churn = get_churn_summary()
        at_risk = get_at_risk_customers(risk_threshold=0.5)
        leakage = get_revenue_leakage_analysis()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error gathering data: {str(e)}")

    # Summarize at-risk customers (limit to top 10 for prompt size)
    at_risk_summary = at_risk[:10] if isinstance(at_risk, list) else at_risk

    context = f"""Revenue at Risk Data:

Churn Summary:
{_format_dict(churn)}

Top At-Risk Customers (≥50% churn probability):
{_format_dict(at_risk_summary)}

Revenue Leakage Sources:
{_format_dict(leakage)}
"""

    if request.question:
        system_prompt = """You are an expert SaaS retention strategist analyzing revenue risk data. Answer the specific question using the data provided. Be concise and actionable."""
        user_message = f"{context}\n\nQuestion: {request.question}"
    else:
        system_prompt = """You are an expert SaaS retention strategist. Analyze the revenue risk data and provide actionable insights. Focus on:
1. Root-cause analysis of churn risk patterns
2. Which customer segments need immediate intervention
3. Specific recommendations to reduce ARR at risk
4. 90-day risk forecast and mitigation plan

Be specific with numbers. Reference actual customer segments and leakage sources."""
        user_message = f"{context}\n\nProvide your risk analysis and intervention recommendations."

    result = _call_claude(system_prompt, user_message, api_key)

    return PageInsightResponse(
        page_id="risk",
        insight=result["insight"],
        model=result["model"],
    )


@router.post("/funnel-insights", response_model=PageInsightResponse)
async def get_funnel_insights(request: PageInsightRequest):
    """Generate AI insights for the Funnel Analysis page."""
    api_key = _get_api_key()

    try:
        funnel = get_funnel_summary()
        conversions = get_stage_conversion_rates()
        velocity = get_velocity_metrics()
        losses = get_loss_reasons()
        reps = get_rep_performance()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error gathering data: {str(e)}")

    # Summarize rep performance (limit for prompt size)
    rep_summary = reps[:10] if isinstance(reps, list) else reps

    context = f"""Funnel Analysis Data:

Funnel Summary:
{_format_dict(funnel)}

Stage Conversion Rates:
{_format_dict(conversions)}

Velocity Metrics (time between stages):
{_format_dict(velocity)}

Loss Reasons:
{_format_dict(losses)}

Rep Performance (top 10):
{_format_dict(rep_summary)}
"""

    if request.question:
        system_prompt = """You are an expert SaaS sales operations analyst reviewing funnel data. Answer the specific question using the data provided. Be concise and actionable."""
        user_message = f"{context}\n\nQuestion: {request.question}"
    else:
        system_prompt = """You are an expert SaaS sales operations analyst. Analyze the funnel data and provide actionable insights. Focus on:
1. Biggest bottleneck in the funnel (which stage transition loses the most value)
2. Top loss reasons and specific fixes for each
3. Rep coaching recommendations (who needs help, who to learn from)
4. Velocity improvements that would have the highest revenue impact

Use specific numbers. Compare conversion rates to identify the weakest link."""
        user_message = f"{context}\n\nProvide your funnel analysis and optimization recommendations."

    result = _call_claude(system_prompt, user_message, api_key)

    return PageInsightResponse(
        page_id="funnel",
        insight=result["insight"],
        model=result["model"],
    )


@router.post("/simulator-insights", response_model=PageInsightResponse)
async def get_simulator_insights(request: PageInsightRequest):
    """Generate AI insights for the What-If Simulator page."""
    api_key = _get_api_key()

    try:
        revenue = get_revenue_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error gathering data: {str(e)}")

    # Include scenario presets for context
    presets = [
        {"id": "reduce_churn_10", "name": "Reduce Churn by 10%", "params": {"churn_reduction": 0.10}},
        {"id": "reduce_churn_25", "name": "Reduce Churn by 25%", "params": {"churn_reduction": 0.25}},
        {"id": "improve_conversion_10", "name": "Improve Win Rate by 10%", "params": {"conversion_improvement": 0.10}},
        {"id": "boost_expansion_20", "name": "Increase Expansion by 20%", "params": {"expansion_increase": 0.20}},
        {"id": "combined_moderate", "name": "Combined Moderate", "params": {"churn_reduction": 0.05, "conversion_improvement": 0.05, "expansion_increase": 0.10}},
        {"id": "combined_aggressive", "name": "Combined Aggressive", "params": {"churn_reduction": 0.15, "conversion_improvement": 0.10, "expansion_increase": 0.25}},
    ]

    context = f"""What-If Simulator Data:

Current Revenue Summary:
{_format_dict(revenue)}

Available Scenario Presets:
{_format_dict(presets)}
"""

    # If the frontend sent a scenario result, include it
    if request.context_data and "scenario_result" in request.context_data:
        context += f"""
Last Simulation Result:
{_format_dict(request.context_data["scenario_result"])}
"""

    if request.question:
        system_prompt = """You are an expert SaaS revenue strategist analyzing what-if scenario data. Answer the specific question using the data provided. Be concise and actionable."""
        user_message = f"{context}\n\nQuestion: {request.question}"
    else:
        system_prompt = """You are an expert SaaS revenue strategist. Based on the current revenue data and available scenarios, provide strategic recommendations. Focus on:
1. Which scenario(s) would have the highest ROI given current metrics
2. Why that scenario best fits the current business situation
3. Optimal parameter values to start with
4. What to monitor to validate the scenario is working

If a simulation result is provided, explain what the numbers mean and what actions to take. Be specific with numbers."""
        user_message = f"{context}\n\nProvide your scenario recommendations and strategic guidance."

    result = _call_claude(system_prompt, user_message, api_key)

    return PageInsightResponse(
        page_id="simulator",
        insight=result["insight"],
        model=result["model"],
    )


@router.post("/revenue-insights", response_model=PageInsightResponse)
async def get_revenue_insights(request: PageInsightRequest):
    """Generate AI insights for the Revenue Intelligence page."""
    api_key = _get_api_key()

    try:
        revenue = get_revenue_summary()
        waterfall = get_mrr_waterfall()
        nrr = get_nrr_trend()
        ltv_cac = get_ltv_cac_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error gathering data: {str(e)}")

    context = f"""Revenue Intelligence Data:

Revenue Summary:
{_format_dict(revenue)}

MRR Waterfall (12-month movements):
{_format_dict(waterfall)}

NRR Trend:
{_format_dict(nrr)}

LTV/CAC Metrics:
{_format_dict(ltv_cac)}
"""

    if request.question:
        system_prompt = """You are an expert SaaS revenue analyst reviewing revenue intelligence data. Answer the specific question using the data provided. Be concise and actionable."""
        user_message = f"{context}\n\nQuestion: {request.question}"
    else:
        system_prompt = """You are an expert SaaS revenue analyst. Analyze the revenue intelligence data and provide insights. Focus on:
1. Revenue trend narrative - is the business accelerating or decelerating?
2. Key MRR movement drivers (what's growing, what's shrinking)
3. NRR health and what's driving it
4. 3-month revenue forecast based on current trends
5. One specific action to improve revenue trajectory

Use specific numbers. Compare metrics to SaaS benchmarks where relevant."""
        user_message = f"{context}\n\nProvide your revenue intelligence analysis and forecast."

    result = _call_claude(system_prompt, user_message, api_key)

    return PageInsightResponse(
        page_id="revenue",
        insight=result["insight"],
        model=result["model"],
    )


# ============================================================================
# Helper Functions
# ============================================================================

def get_health_category(score: float) -> str:
    """Get health category from score."""
    if score >= 70:
        return "Healthy"
    elif score >= 40:
        return "At Risk"
    else:
        return "Critical"


def get_nps_category(score: int) -> str:
    """Get NPS category from score."""
    if score >= 9:
        return "Promoter"
    elif score >= 7:
        return "Passive"
    else:
        return "Detractor"
