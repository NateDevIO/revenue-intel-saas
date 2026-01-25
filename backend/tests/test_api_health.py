"""
Health Check and Root Endpoint Tests
=====================================

Tests for basic API health and status endpoints.
"""

import pytest


def test_root_endpoint(client):
    """Test the root endpoint returns basic API info."""
    response = client.get("/")

    assert response.status_code == 200
    data = response.json()

    assert data["name"] == "SaaS Revenue Lifecycle Analyzer API"
    assert data["version"] == "1.0.0"
    assert data["status"] == "healthy"
    assert data["docs"] == "/docs"


def test_health_check_endpoint(client):
    """Test the health check endpoint."""
    response = client.get("/api/health")

    assert response.status_code == 200
    data = response.json()

    assert "status" in data
    assert "database" in data
    assert data["status"] in ["healthy", "unhealthy"]


def test_health_check_includes_database_stats(client):
    """Test that health check includes database statistics."""
    response = client.get("/api/health")

    assert response.status_code == 200
    data = response.json()

    if data["status"] == "healthy":
        assert "tables" in data
        assert isinstance(data["tables"], dict)
