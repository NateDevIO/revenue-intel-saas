"""
Customer and Churn Endpoint Tests
==================================

Tests for customer health and churn prediction endpoints.
"""

import pytest


def test_customers_list_endpoint(client):
    """Test the customers list endpoint."""
    response = client.get("/api/customers")

    assert response.status_code == 200
    data = response.json()

    # Should return paginated customer data
    assert "data" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data

    customers = data["data"]
    assert isinstance(customers, list)

    if customers:
        customer = customers[0]
        assert "customer_id" in customer
        assert "company_name" in customer
        assert "current_mrr" in customer
        assert "status" in customer


def test_customers_pagination(client):
    """Test customer list pagination."""
    # Get first page
    response = client.get("/api/customers?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()

    assert data["page"] == 1
    assert data["page_size"] == 10
    assert len(data["data"]) <= 10


def test_customers_filtering_by_health(client):
    """Test filtering customers by health score."""
    response = client.get("/api/customers?health=Red")

    assert response.status_code == 200
    data = response.json()

    # All returned customers should have Red health
    customers = data["data"]
    for customer in customers:
        if customer.get("health_score"):
            assert customer["health_score"] == "Red"


def test_at_risk_customers_endpoint(client):
    """Test the at-risk customers endpoint."""
    response = client.get("/api/churn/at-risk")

    assert response.status_code == 200
    data = response.json()

    # Should return list of at-risk customers
    assert isinstance(data, list)

    if data:
        customer = data[0]
        assert "customer_id" in customer
        assert "churn_probability" in customer
        assert "current_mrr" in customer

        # Churn probability should be high
        assert customer["churn_probability"] > 0.5


def test_churn_summary_endpoint(client):
    """Test the churn summary endpoint."""
    response = client.get("/api/churn/summary")

    assert response.status_code == 200
    data = response.json()

    assert "churn_rate" in data
    assert "arr_at_risk" in data
    assert "churned_customers_12m" in data


def test_customer_health_distribution(client):
    """Test customer health distribution endpoint."""
    response = client.get("/api/customers/health-distribution")

    assert response.status_code == 200
    data = response.json()

    # Should have distribution by health score
    assert "distribution" in data

    distribution = data["distribution"]
    # Should have Green, Yellow, Red categories
    assert "Green" in distribution or "Yellow" in distribution or "Red" in distribution
