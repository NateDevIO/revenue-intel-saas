"""
What-If Simulator Routes
========================

API endpoints for scenario simulation including:
- What-if scenario calculation
- Monte Carlo simulation
- Sensitivity analysis
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from analysis import run_monte_carlo_simulation, get_revenue_summary

router = APIRouter()


class WhatIfScenario(BaseModel):
    """What-if scenario parameters."""
    name: str = Field(default="Custom Scenario", description="Scenario name")
    churn_reduction: Optional[float] = Field(None, ge=0, le=1, description="Churn reduction percentage (0-1)")
    conversion_improvement: Optional[float] = Field(None, ge=0, le=1, description="Conversion rate improvement (0-1)")
    expansion_increase: Optional[float] = Field(None, ge=0, le=1, description="Expansion revenue increase (0-1)")
    price_increase: Optional[float] = Field(None, ge=-0.5, le=0.5, description="Price change percentage")
    lead_volume_increase: Optional[float] = Field(None, ge=-0.5, le=1, description="Lead volume change")


@router.post("/what-if")
async def run_what_if(scenario: WhatIfScenario) -> Dict[str, Any]:
    """
    Run what-if scenario simulation.

    Calculates projected ARR impact with confidence intervals using Monte Carlo.
    """
    try:
        scenario_dict = scenario.model_dump(exclude_none=True)

        if len(scenario_dict) <= 1:  # Only name
            raise HTTPException(status_code=400, detail="At least one scenario parameter required")

        result = run_monte_carlo_simulation(scenario_dict)

        # Add scenario parameters to result
        result['parameters'] = scenario_dict

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/presets")
async def get_scenario_presets() -> List[Dict[str, Any]]:
    """
    Get preset scenario configurations.

    Returns common what-if scenarios for quick analysis.
    """
    return [
        {
            "id": "reduce_churn_10",
            "name": "Reduce Churn by 10%",
            "description": "What if we reduced monthly churn rate by 10%?",
            "parameters": {
                "name": "Reduce Churn 10%",
                "churn_reduction": 0.10
            }
        },
        {
            "id": "reduce_churn_25",
            "name": "Reduce Churn by 25%",
            "description": "What if we reduced monthly churn rate by 25%?",
            "parameters": {
                "name": "Reduce Churn 25%",
                "churn_reduction": 0.25
            }
        },
        {
            "id": "improve_conversion_10",
            "name": "Improve Win Rate by 10%",
            "description": "What if we improved sales conversion by 10%?",
            "parameters": {
                "name": "Improve Win Rate 10%",
                "conversion_improvement": 0.10
            }
        },
        {
            "id": "boost_expansion_20",
            "name": "Increase Expansion by 20%",
            "description": "What if we increased expansion revenue by 20%?",
            "parameters": {
                "name": "Boost Expansion 20%",
                "expansion_increase": 0.20
            }
        },
        {
            "id": "combined_moderate",
            "name": "Combined Moderate Improvement",
            "description": "5% churn reduction + 5% conversion improvement + 10% expansion increase",
            "parameters": {
                "name": "Combined Moderate",
                "churn_reduction": 0.05,
                "conversion_improvement": 0.05,
                "expansion_increase": 0.10
            }
        },
        {
            "id": "combined_aggressive",
            "name": "Combined Aggressive Improvement",
            "description": "15% churn reduction + 10% conversion improvement + 25% expansion increase",
            "parameters": {
                "name": "Combined Aggressive",
                "churn_reduction": 0.15,
                "conversion_improvement": 0.10,
                "expansion_increase": 0.25
            }
        }
    ]


@router.get("/presets/{preset_id}/run")
async def run_preset_scenario(preset_id: str) -> Dict[str, Any]:
    """
    Run a preset scenario simulation.

    Quick access to common scenarios without custom parameters.
    """
    presets = {
        "reduce_churn_10": {"name": "Reduce Churn 10%", "churn_reduction": 0.10},
        "reduce_churn_25": {"name": "Reduce Churn 25%", "churn_reduction": 0.25},
        "improve_conversion_10": {"name": "Improve Win Rate 10%", "conversion_improvement": 0.10},
        "boost_expansion_20": {"name": "Boost Expansion 20%", "expansion_increase": 0.20},
        "combined_moderate": {"name": "Combined Moderate", "churn_reduction": 0.05, "conversion_improvement": 0.05, "expansion_increase": 0.10},
        "combined_aggressive": {"name": "Combined Aggressive", "churn_reduction": 0.15, "conversion_improvement": 0.10, "expansion_increase": 0.25},
    }

    if preset_id not in presets:
        raise HTTPException(status_code=404, detail=f"Preset not found. Available: {list(presets.keys())}")

    try:
        result = run_monte_carlo_simulation(presets[preset_id])
        result['preset_id'] = preset_id
        result['parameters'] = presets[preset_id]
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sensitivity")
async def sensitivity_analysis(
    variable: str = Query("churn_reduction", description="Variable to analyze"),
    min_value: float = Query(0.0, description="Minimum value"),
    max_value: float = Query(0.3, description="Maximum value"),
    steps: int = Query(10, ge=2, le=20, description="Number of steps")
) -> Dict[str, Any]:
    """
    Run sensitivity analysis on a single variable.

    Returns ARR impact across a range of values for the specified variable.
    """
    try:
        valid_variables = ['churn_reduction', 'conversion_improvement', 'expansion_increase']
        if variable not in valid_variables:
            raise HTTPException(status_code=400, detail=f"Invalid variable. Must be one of: {valid_variables}")

        results = []
        step_size = (max_value - min_value) / (steps - 1)

        for i in range(steps):
            value = min_value + (i * step_size)
            scenario = {"name": f"{variable}={value:.2%}", variable: value}

            sim_result = run_monte_carlo_simulation(scenario, iterations=500)

            results.append({
                'value': value,
                'arr_impact': sim_result['arr_impact_mean'],
                'confidence_low': sim_result['confidence_interval_10'],
                'confidence_high': sim_result['confidence_interval_90']
            })

        # Get current metrics for context
        summary = get_revenue_summary()

        return {
            'variable': variable,
            'min_value': min_value,
            'max_value': max_value,
            'results': results,
            'current_arr': summary.get('current_arr', 0),
            'interpretation': f"Shows how {variable.replace('_', ' ')} affects projected ARR"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compare")
async def compare_scenarios(
    scenario_ids: str = Query(..., description="Comma-separated preset IDs")
) -> Dict[str, Any]:
    """
    Compare multiple scenarios side by side.

    Returns comparison of ARR impact and confidence intervals.
    """
    presets = {
        "reduce_churn_10": {"name": "Reduce Churn 10%", "churn_reduction": 0.10},
        "reduce_churn_25": {"name": "Reduce Churn 25%", "churn_reduction": 0.25},
        "improve_conversion_10": {"name": "Improve Win Rate 10%", "conversion_improvement": 0.10},
        "boost_expansion_20": {"name": "Boost Expansion 20%", "expansion_increase": 0.20},
        "combined_moderate": {"name": "Combined Moderate", "churn_reduction": 0.05, "conversion_improvement": 0.05, "expansion_increase": 0.10},
        "combined_aggressive": {"name": "Combined Aggressive", "churn_reduction": 0.15, "conversion_improvement": 0.10, "expansion_increase": 0.25},
    }

    try:
        ids = [s.strip() for s in scenario_ids.split(',')]

        if len(ids) > 5:
            raise HTTPException(status_code=400, detail="Maximum 5 scenarios for comparison")

        results = []
        for preset_id in ids:
            if preset_id not in presets:
                continue

            sim_result = run_monte_carlo_simulation(presets[preset_id])
            results.append({
                'id': preset_id,
                'name': presets[preset_id]['name'],
                'parameters': presets[preset_id],
                'arr_impact': sim_result['arr_impact_mean'],
                'projected_arr': sim_result['projected_arr_mean'],
                'confidence_low': sim_result['confidence_interval_10'],
                'confidence_high': sim_result['confidence_interval_90']
            })

        # Sort by ARR impact
        results.sort(key=lambda x: x['arr_impact'], reverse=True)

        summary = get_revenue_summary()

        return {
            'current_arr': summary.get('current_arr', 0),
            'scenarios': results,
            'best_scenario': results[0] if results else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
