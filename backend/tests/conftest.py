"""
Pytest Configuration and Fixtures
==================================

Shared test fixtures for API testing.
"""

import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from api.main import app


@pytest.fixture
def client():
    """
    Create a test client for the FastAPI application.

    Usage:
        def test_endpoint(client):
            response = client.get("/api/health")
            assert response.status_code == 200
    """
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def sample_customer_data():
    """Sample customer data for testing."""
    return {
        "customer_id": "test-customer-1",
        "company_name": "Test Company",
        "company_size": "Mid-Market",
        "industry": "Technology",
        "current_mrr": 5000,
        "status": "Active",
        "health_score": "Green",
    }


@pytest.fixture
def sample_scenario():
    """Sample what-if scenario for testing."""
    return {
        "name": "Test Scenario",
        "churn_rate_change": -0.05,
        "conversion_rate_change": 0.10,
        "expansion_rate_change": 0.15,
    }
