"""
Simulator Endpoint Tests
=========================

Tests for what-if scenario simulator endpoints.
"""

import pytest


def test_scenario_presets_endpoint(client):
    """Test the scenario presets endpoint."""
    response = client.get("/api/simulator/presets")

    assert response.status_code == 200
    data = response.json()

    # Should return list of preset scenarios
    assert isinstance(data, list)

    if data:
        preset = data[0]
        assert "name" in preset
        assert "description" in preset
        assert "churn_rate_change" in preset or "conversion_rate_change" in preset


def test_run_preset_scenario(client):
    """Test running a preset scenario."""
    # First get a preset
    presets_response = client.get("/api/simulator/presets")
    presets = presets_response.json()

    if not presets:
        pytest.skip("No presets available")

    preset_name = presets[0]["name"]

    # Run the preset
    response = client.post(f"/api/simulator/run-preset/{preset_name}")

    assert response.status_code == 200
    data = response.json()

    # Check result structure
    assert "scenario_name" in data
    assert "current_arr" in data
    assert "projected_arr" in data
    assert "arr_change" in data
    assert "confidence_interval" in data


def test_run_custom_scenario(client, sample_scenario):
    """Test running a custom what-if scenario."""
    response = client.post("/api/simulator/run-scenario", json=sample_scenario)

    assert response.status_code == 200
    data = response.json()

    # Check result structure
    assert "scenario_name" in data
    assert "current_arr" in data
    assert "projected_arr" in data
    assert "arr_change" in data

    # ARR change should be different from current
    assert data["projected_arr"] != data["current_arr"]


def test_invalid_scenario_returns_error(client):
    """Test that invalid scenario data returns an error."""
    invalid_scenario = {
        "name": "Invalid",
        # Missing required fields
    }

    response = client.post("/api/simulator/run-scenario", json=invalid_scenario)

    # Should return validation error
    assert response.status_code == 422  # Unprocessable Entity


def test_scenario_confidence_intervals(client, sample_scenario):
    """Test that scenarios include confidence intervals."""
    response = client.post("/api/simulator/run-scenario", json=sample_scenario)

    assert response.status_code == 200
    data = response.json()

    assert "confidence_interval" in data
    ci = data["confidence_interval"]

    assert "low" in ci
    assert "high" in ci

    # Low should be less than high
    assert ci["low"] <= ci["high"]
