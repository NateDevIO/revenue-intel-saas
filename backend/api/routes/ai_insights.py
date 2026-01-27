from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
from typing import Optional
from anthropic import Anthropic
from data.database import get_connection

router = APIRouter()

class AIInsightRequest(BaseModel):
    customer_id: str
    question: Optional[str] = None

class AIInsightResponse(BaseModel):
    customer_id: str
    customer_name: str
    insight: str
    model: str

@router.post("/customer-insights", response_model=AIInsightResponse)
async def get_customer_insights(request: AIInsightRequest):
    """
    Generate AI-powered insights about a specific customer using Claude API.
    """
    # Get API key from environment
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY environment variable not set. Please configure your Claude API key."
        )

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

    # Create Claude client
    client = Anthropic(api_key=api_key)

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

    # Call Claude API
    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": user_message
                }
            ]
        )

        insight = message.content[0].text

        return AIInsightResponse(
            customer_id=request.customer_id,
            customer_name=customer_data[1],
            insight=insight,
            model=message.model
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error calling Claude API: {str(e)}"
        )


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
