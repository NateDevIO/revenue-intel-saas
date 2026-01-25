"""
API Middleware
==============

Request/response middleware for logging, performance monitoring, and error tracking.
"""

import time
import logging
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class PerformanceMonitoringMiddleware(BaseHTTPMiddleware):
    """
    Middleware to track API request performance.

    Logs:
    - Request method and path
    - Response status code
    - Request duration
    - Slow requests (>2s warning, >5s error)
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip monitoring for health check endpoint
        if request.url.path == "/api/health":
            return await call_next(request)

        # Start timing
        start_time = time.time()

        # Process request
        try:
            response = await call_next(request)

            # Calculate duration
            duration = time.time() - start_time
            duration_ms = round(duration * 1000, 2)

            # Log request
            log_data = {
                'method': request.method,
                'path': request.url.path,
                'status': response.status_code,
                'duration_ms': duration_ms,
            }

            # Add duration header
            response.headers["X-Response-Time"] = f"{duration_ms}ms"

            # Log based on performance
            if duration >= 5.0:
                logger.error(f"VERY SLOW REQUEST: {log_data}")
            elif duration >= 2.0:
                logger.warning(f"Slow request: {log_data}")
            else:
                logger.info(f"Request: {log_data}")

            return response

        except Exception as e:
            # Log error
            duration = time.time() - start_time
            duration_ms = round(duration * 1000, 2)

            logger.error(
                f"Request failed: {request.method} {request.url.path} - "
                f"Error: {str(e)} - Duration: {duration_ms}ms"
            )
            raise


class ErrorTrackingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to catch and log unhandled errors.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            return await call_next(request)
        except Exception as e:
            # Log the error with full traceback
            logger.exception(
                f"Unhandled error on {request.method} {request.url.path}: {str(e)}"
            )

            # Return generic error response
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal server error",
                    "message": "An unexpected error occurred. Please try again later.",
                    "path": str(request.url.path),
                }
            )


def log_startup_info():
    """Log application startup information."""
    logger.info("=" * 60)
    logger.info("SaaS Revenue Lifecycle Analyzer API Starting")
    logger.info("=" * 60)
    logger.info("Performance monitoring enabled")
    logger.info("Error tracking enabled")
    logger.info("Cache enabled with TTL-based expiration")
    logger.info("=" * 60)


def log_request_summary(path: str, method: str, duration_ms: float, status: int):
    """
    Log request summary for analytics.

    In production, this could send metrics to a monitoring service like:
    - DataDog
    - New Relic
    - Prometheus
    - CloudWatch
    """
    if duration_ms > 1000:
        logger.warning(
            f"Performance degradation detected - "
            f"{method} {path} took {duration_ms}ms (status: {status})"
        )
