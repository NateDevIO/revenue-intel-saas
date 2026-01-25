"""
API Routes Module
=================

Contains all FastAPI route handlers for the application.
"""

from . import funnel, customers, churn, revenue, simulator

__all__ = ['funnel', 'customers', 'churn', 'revenue', 'simulator']
