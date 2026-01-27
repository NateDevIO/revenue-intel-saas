"""
FastAPI Application Entry Point
===============================

Main FastAPI application for the SaaS Revenue Lifecycle Analyzer.
Provides REST API endpoints for analytics, predictions, and simulations.
"""

import sys
from pathlib import Path

# Add backend directory to path for absolute imports
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from typing import Dict, Any

from api.routes import funnel, customers, churn, revenue, simulator, ai_insights
from api.errors import (
    APIError,
    api_error_handler,
    validation_error_handler,
    generic_error_handler,
)
from api.cache import cached, get_cache_config
from api.middleware import (
    PerformanceMonitoringMiddleware,
    ErrorTrackingMiddleware,
    log_startup_info,
)
from data.database import table_exists, get_database_stats
from data.generator import generate_and_save
from analysis import (
    get_funnel_summary,
    get_revenue_summary,
    get_churn_summary,
    get_health_distribution,
    get_action_priority_matrix,
)
from analysis.churn import get_at_risk_customers


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown."""
    # Startup: Check if data exists, generate if not
    log_startup_info()
    print("Starting SaaS Revenue Lifecycle Analyzer API...")

    # Check if table exists AND has data
    stats = get_database_stats()
    customer_count = stats.get('customers', 0)

    if not table_exists('customers') or customer_count == 0:
        print("No data found. Generating synthetic data...")
        generate_and_save()
        stats = get_database_stats()
        print(f"Data generation complete! {stats.get('customers', 0)} customers created.")
    else:
        print(f"Database loaded with {customer_count} customers")

    yield

    # Shutdown
    print("Shutting down API...")


# Create FastAPI app
app = FastAPI(
    title="SaaS Revenue Lifecycle Analyzer API",
    description="""
    A comprehensive Revenue Intelligence Platform that identifies revenue leakage
    across the customer lifecycle.

    ## Core Value Proposition
    Every output answers "What should the business do Monday morning?"
    with quantified dollar impact and confidence intervals.

    ## Key Features
    - **Funnel Analytics**: Conversion rates, velocity metrics, cohort analysis
    - **Customer Health**: Health scoring, churn predictions, risk assessment
    - **Revenue Intelligence**: LTV/CAC, NRR, revenue leakage analysis
    - **What-If Simulator**: Monte Carlo simulations for scenario planning
    - **Prioritized Actions**: Recommendations with expected ARR impact
    """,
    version="1.0.0",
    lifespan=lifespan,
)

# Add performance monitoring and error tracking middleware
app.add_middleware(PerformanceMonitoringMiddleware)
app.add_middleware(ErrorTrackingMiddleware)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register error handlers
app.add_exception_handler(APIError, api_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(Exception, generic_error_handler)

# Include route modules
app.include_router(funnel.router, prefix="/api/funnel", tags=["Funnel Analytics"])
app.include_router(customers.router, prefix="/api/customers", tags=["Customer Analytics"])
app.include_router(churn.router, prefix="/api/churn", tags=["Churn Prediction"])
app.include_router(revenue.router, prefix="/api/revenue", tags=["Revenue Intelligence"])
app.include_router(simulator.router, prefix="/api/simulator", tags=["What-If Simulator"])
app.include_router(ai_insights.router, prefix="/api/ai", tags=["AI Insights"])


@app.get("/", tags=["Health"])
async def root():
    """API root endpoint with basic info."""
    return {
        "name": "SaaS Revenue Lifecycle Analyzer API",
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/docs"
    }


@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    try:
        stats = get_database_stats()
        return {
            "status": "healthy",
            "database": "connected",
            "tables": stats
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


@app.get("/api/summary", tags=["Executive Summary"])
@cached(**get_cache_config("summary"))
async def get_executive_summary() -> Dict[str, Any]:
    """
    Get executive summary with key metrics.

    Returns all critical KPIs in a single request for the dashboard header.
    Cached for 60 seconds to improve performance.
    """
    try:
        funnel = get_funnel_summary()
        revenue = get_revenue_summary()
        churn = get_churn_summary()
        health = get_health_distribution()

        return {
            "pipeline": {
                "total_value": funnel.get('total_pipeline_value', 0),
                "total_count": funnel.get('total_opportunities', 0),
                "conversion_rate": funnel.get('overall_conversion_rate', 0),
                "won_value": funnel.get('closed_won_value', 0),
            },
            "revenue": {
                "current_arr": revenue.get('current_arr', 0),
                "current_mrr": revenue.get('current_mrr', 0),
                "nrr": revenue.get('nrr', 0),
                "ltv_cac_ratio": revenue.get('ltv_cac_ratio', 0),
            },
            "customers": {
                "total_active": revenue.get('active_customers', 0),
                "avg_mrr": revenue.get('avg_mrr_per_customer', 0),
                "health_distribution": health.get('distribution', {}),
            },
            "risk": {
                "arr_at_risk": churn.get('arr_at_risk', 0),
                "churn_rate": churn.get('churn_rate', 0),
                "critical_accounts": len(get_at_risk_customers(risk_threshold=0.7, min_mrr=0)),
            },
            "period": {
                "new_mrr_12m": revenue.get('new_mrr_12m', 0),
                "expansion_mrr_12m": revenue.get('expansion_mrr_12m', 0),
                "contraction_mrr_12m": revenue.get('contraction_mrr_12m', 0),
                "churn_mrr_12m": revenue.get('churn_mrr_12m', 0),
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/actions", tags=["Prioritized Actions"])
@cached(**get_cache_config("actions"))
async def get_prioritized_actions() -> Dict[str, Any]:
    """
    Get prioritized action recommendations.

    Returns top recommendations with expected ARR impact and confidence intervals.
    Cached for 5 minutes to improve performance.
    """
    try:
        actions = get_action_priority_matrix()

        return {
            "recommendations": actions[:5],  # Top 5 actions
            "total_potential_impact": sum(a.get('expected_arr_impact', 0) for a in actions),
            "methodology": "Actions prioritized by expected ARR impact × confidence"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/benchmarks", tags=["Benchmarks"])
async def get_benchmarks() -> Dict[str, Any]:
    """
    Get industry benchmark comparisons.

    Compares key metrics against SaaS industry medians.
    """
    try:
        from analysis import get_industry_benchmarks
        return get_industry_benchmarks()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/data/regenerate", tags=["Admin"])
async def regenerate_data():
    """
    Regenerate synthetic data.

    Warning: This will replace all existing data.
    """
    try:
        generate_and_save()
        stats = get_database_stats()
        return {
            "status": "success",
            "message": "Data regenerated successfully",
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
