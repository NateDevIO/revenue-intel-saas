"""
Error Handling Module
====================

Provides standardized error responses and exception handlers.
"""

from typing import Any, Dict
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

logger = logging.getLogger(__name__)


class APIError(HTTPException):
    """Base class for API errors with user-friendly messages."""

    def __init__(
        self,
        status_code: int,
        message: str,
        details: Dict[str, Any] = None,
        internal_message: str = None
    ):
        self.message = message
        self.details = details or {}
        self.internal_message = internal_message
        super().__init__(status_code=status_code, detail=message)


class ValidationError(APIError):
    """Raised when input validation fails."""

    def __init__(self, message: str, field: str = None):
        details = {"field": field} if field else {}
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=message,
            details=details
        )


class NotFoundError(APIError):
    """Raised when a resource is not found."""

    def __init__(self, resource: str, identifier: str = None):
        message = f"{resource} not found"
        if identifier:
            message += f": {identifier}"
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            message=message
        )


class DatabaseError(APIError):
    """Raised when a database operation fails."""

    def __init__(self, operation: str, internal_message: str = None):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"Database error during {operation}. Please try again later.",
            internal_message=internal_message
        )


def create_error_response(
    status_code: int,
    message: str,
    details: Dict[str, Any] = None
) -> JSONResponse:
    """Create a standardized error response."""
    content = {
        "error": {
            "message": message,
            "code": status_code,
        }
    }
    if details:
        content["error"]["details"] = details

    return JSONResponse(
        status_code=status_code,
        content=content
    )


async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    """Handle APIError exceptions."""
    if exc.internal_message:
        logger.error(f"API Error: {exc.internal_message}", exc_info=True)
    else:
        logger.warning(f"API Error: {exc.message}")

    return create_error_response(
        status_code=exc.status_code,
        message=exc.message,
        details=exc.details
    )


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle request validation errors."""
    errors = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"])
        errors.append({
            "field": field,
            "message": error["msg"],
            "type": error["type"]
        })

    return create_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        message="Request validation failed",
        details={"errors": errors}
    )


async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected errors."""
    logger.error(f"Unexpected error: {str(exc)}", exc_info=True)

    # Don't expose internal error details in production
    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message="An unexpected error occurred. Please try again later."
    )
