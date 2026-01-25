"""
Revenue and Funnel Endpoint Tests
==================================

Tests for revenue intelligence and funnel analytics endpoints.
"""

import pytest


def test_revenue_summary_endpoint(client):
    """Test the revenue summary endpoint."""
    response = client.get("/api/revenue/summary")

    assert response.status_code == 200
    data = response.json()

    # Check required fields
    assert "current_arr" in data
    assert "current_mrr" in data
    assert "active_customers" in data
    assert "nrr" in data
    assert "ltv_cac_ratio" in data


def test_mrr_waterfall_endpoint(client):
    """Test the MRR waterfall endpoint."""
    response = client.get("/api/revenue/waterfall")

    assert response.status_code == 200
    data = response.json()

    # Should return a list of waterfall items
    assert isinstance(data, list)

    if data:
        # Check structure of first item
        item = data[0]
        assert "category" in item
        assert "amount" in item
        assert "is_positive" in item or "is_total" in item


def test_funnel_summary_endpoint(client):
    """Test the funnel summary endpoint."""
    response = client.get("/api/funnel/summary")

    assert response.status_code == 200
    data = response.json()

    # Check required fields
    assert "total_opportunities" in data
    assert "total_pipeline_value" in data
    assert "overall_conversion_rate" in data


def test_conversion_rates_endpoint(client):
    """Test the conversion rates endpoint."""
    response = client.get("/api/funnel/conversion-rates")

    assert response.status_code == 200
    data = response.json()

    # Should return a list of conversion rate data
    assert isinstance(data, list)

    if data:
        # Check structure
        conv = data[0]
        assert "from_stage" in conv
        assert "to_stage" in conv
        assert "conversion_rate" in conv
        assert "from_count" in conv
        assert "to_count" in conv


def test_velocity_metrics_endpoint(client):
    """Test the velocity metrics endpoint."""
    response = client.get("/api/funnel/velocity")

    assert response.status_code == 200
    data = response.json()

    # Should return a list
    assert isinstance(data, list)

    if data:
        metric = data[0]
        assert "from_stage" in metric
        assert "to_stage" in metric
        assert "median_days" in metric
        assert "avg_days" in metric
