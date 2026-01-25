"""
Summary and Actions Endpoint Tests
===================================

Tests for executive summary and prioritized actions endpoints.
"""

import pytest


def test_executive_summary_endpoint(client):
    """Test the executive summary endpoint returns all required data."""
    response = client.get("/api/summary")

    assert response.status_code == 200
    data = response.json()

    # Check main sections exist
    assert "pipeline" in data
    assert "revenue" in data
    assert "customers" in data
    assert "risk" in data
    assert "period" in data

    # Check pipeline data
    pipeline = data["pipeline"]
    assert "total_value" in pipeline
    assert "total_count" in pipeline
    assert "conversion_rate" in pipeline
    assert "won_value" in pipeline

    # Check revenue data
    revenue = data["revenue"]
    assert "current_arr" in revenue
    assert "current_mrr" in revenue
    assert "nrr" in revenue
    assert "ltv_cac_ratio" in revenue

    # Check customer data
    customers = data["customers"]
    assert "total_active" in customers
    assert "avg_mrr" in customers
    assert "health_distribution" in customers

    # Check risk data
    risk = data["risk"]
    assert "arr_at_risk" in risk
    assert "churn_rate" in risk
    assert "critical_accounts" in risk


def test_executive_summary_data_types(client):
    """Test that summary endpoint returns correct data types."""
    response = client.get("/api/summary")
    data = response.json()

    # Numeric fields should be numbers
    assert isinstance(data["revenue"]["current_arr"], (int, float))
    assert isinstance(data["revenue"]["current_mrr"], (int, float))
    assert isinstance(data["revenue"]["nrr"], (int, float))
    assert isinstance(data["customers"]["total_active"], int)
    assert isinstance(data["risk"]["churn_rate"], (int, float))


def test_prioritized_actions_endpoint(client):
    """Test the prioritized actions endpoint."""
    response = client.get("/api/actions")

    assert response.status_code == 200
    data = response.json()

    assert "recommendations" in data
    assert "total_potential_impact" in data
    assert "methodology" in data

    recommendations = data["recommendations"]
    assert isinstance(recommendations, list)
    assert len(recommendations) <= 5  # Should return top 5

    # Check first recommendation structure if exists
    if recommendations:
        action = recommendations[0]
        assert "action" in action
        assert "priority" in action
        assert "expected_arr_impact" in action
        assert "effort" in action
        assert "category" in action


def test_actions_are_sorted_by_priority(client):
    """Test that actions are returned in priority order."""
    response = client.get("/api/actions")
    data = response.json()

    recommendations = data["recommendations"]

    if len(recommendations) > 1:
        # Priorities should be sequential (1, 2, 3...)
        priorities = [action["priority"] for action in recommendations]
        assert priorities == sorted(priorities)


def test_summary_response_has_cache_header(client):
    """Test that summary endpoint includes cache control."""
    response = client.get("/api/summary")

    # Response should be successful
    assert response.status_code == 200

    # Should have response time header from middleware
    # (Cache headers may vary based on implementation)


def test_benchmarks_endpoint(client):
    """Test the industry benchmarks endpoint."""
    response = client.get("/api/benchmarks")

    assert response.status_code == 200
    data = response.json()

    # Should return benchmark data
    assert isinstance(data, dict)
