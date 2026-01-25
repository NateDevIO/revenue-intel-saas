# Backend API Tests

## Overview

Comprehensive test suite for the SaaS Revenue Lifecycle Analyzer API using pytest.

## Test Structure

```
backend/tests/
├── __init__.py
├── conftest.py                  # Shared fixtures and configuration
├── test_api_health.py           # Health check endpoints
├── test_api_summary.py          # Executive summary and actions
├── test_api_revenue.py          # Revenue and funnel analytics
├── test_api_customers.py        # Customer and churn endpoints
└── test_api_simulator.py        # What-if scenario simulator
```

## Running Tests

### All Tests

```bash
cd backend
python -m pytest tests/
```

### Specific Test File

```bash
python -m pytest tests/test_api_health.py
```

### With Verbose Output

```bash
python -m pytest tests/ -v
```

### With Coverage

```bash
pip install pytest-cov
python -m pytest tests/ --cov=api --cov-report=html
```

## Test Categories

### Health Check Tests (`test_api_health.py`)
- ✅ Root endpoint returns API info
- ✅ Health check returns status
- ✅ Health check includes database stats

### Summary Tests (`test_api_summary.py`)
- ✅ Executive summary returns all sections
- ✅ Data types are correct
- ✅ Prioritized actions endpoint works
- ✅ Actions are sorted by priority
- ✅ Benchmarks endpoint returns data

### Revenue Tests (`test_api_revenue.py`)
- ✅ Revenue summary endpoint
- ✅ MRR waterfall endpoint
- ✅ Funnel summary endpoint
- ✅ Conversion rates endpoint
- ✅ Velocity metrics endpoint

### Customer Tests (`test_api_customers.py`)
- ✅ Customers list endpoint
- ✅ Pagination works correctly
- ✅ Filtering by health score
- ✅ At-risk customers endpoint
- ✅ Churn summary endpoint
- ✅ Health distribution endpoint

### Simulator Tests (`test_api_simulator.py`)
- ✅ Scenario presets endpoint
- ✅ Run preset scenario
- ✅ Run custom scenario
- ✅ Invalid scenario validation
- ✅ Confidence intervals included

## Test Fixtures

### `client`
FastAPI test client for making API requests

```python
def test_example(client):
    response = client.get("/api/health")
    assert response.status_code == 200
```

### `sample_customer_data`
Sample customer data for testing

### `sample_scenario`
Sample what-if scenario for testing

## Writing New Tests

### Example Test

```python
def test_new_endpoint(client):
    """Test description."""
    # Make request
    response = client.get("/api/new-endpoint")

    # Check status
    assert response.status_code == 200

    # Check response data
    data = response.json()
    assert "expected_field" in data
    assert isinstance(data["expected_field"], str)
```

### Best Practices

1. **Descriptive Names**: Use clear test function names
2. **Docstrings**: Add docstring describing what's being tested
3. **Single Assertion Focus**: Each test should verify one behavior
4. **Arrange-Act-Assert**: Structure tests clearly
5. **Use Fixtures**: Reuse common test data

## Configuration

Test configuration in `pytest.ini`:

```ini
[pytest]
testpaths = tests
addopts = -v --tb=short --strict-markers
markers =
    slow: marks tests as slow
    integration: marks tests as integration tests
    unit: marks tests as unit tests
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov
      - name: Run tests
        run: pytest tests/ --cov=api
```

## Troubleshooting

### Import Errors

Ensure backend dependencies are installed:
```bash
pip install -r requirements.txt
```

### Database Errors

Tests use the same database as the application. Ensure data exists:
```bash
cd backend
python -c "from data.generator import generate_and_save; generate_and_save()"
```

### Slow Tests

Mark slow tests and skip them:
```bash
# Mark test as slow
@pytest.mark.slow
def test_slow_operation(client):
    ...

# Skip slow tests
pytest tests/ -m "not slow"
```

## Test Coverage Goals

- **Target**: 80%+ code coverage
- **Critical Paths**: 100% coverage for:
  - Revenue calculations
  - Churn predictions
  - Data validation
  - Error handling

## Next Steps

### Additional Tests to Add

1. **Integration Tests**
   - Full end-to-end scenarios
   - Data generation and analysis pipeline

2. **Performance Tests**
   - API response times
   - Database query performance
   - Cache effectiveness

3. **Error Handling Tests**
   - Invalid parameters
   - Missing data scenarios
   - Database connection failures

4. **Security Tests**
   - SQL injection prevention (already implemented)
   - Input validation
   - Rate limiting

## Resources

- [pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [pytest-cov Plugin](https://pytest-cov.readthedocs.io/)
