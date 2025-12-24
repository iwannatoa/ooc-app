"""
Controller helper utilities
Provides common functions for controllers
"""
from functools import wraps
from flask import jsonify
from typing import Optional, Callable, Any
from utils.i18n import get_i18n_text
from utils.exceptions import APIError, ValidationError, ProviderError, ServiceError
from utils.logger import get_logger

logger = get_logger(__name__)


def error_response(
    language: str,
    error_key: str,
    status_code: int = 400,
    default_message: Optional[str] = None
):
    """
    Create a standardized error response
    
    Args:
        language: Language code ('zh' or 'en')
        error_key: Error message key (e.g., 'error_messages.conversation_id_required')
        status_code: HTTP status code
        default_message: Default message if key not found
    
    Returns:
        Flask JSON response with error
    """
    error_msg = get_i18n_text(language, error_key, default=default_message or error_key)
    return jsonify({
        "success": False,
        "error": error_msg
    }), status_code


def validate_required(
    language: str,
    value: any,
    field_name: str,
    error_key: Optional[str] = None
):
    """
    Validate required field and return error response if missing
    
    Args:
        language: Language code ('zh' or 'en')
        value: Value to validate
        field_name: Field name for error message
        error_key: Optional custom error key
    
    Returns:
        Error response tuple if validation fails, None otherwise
    """
    if not value:
        if error_key:
            return error_response(language, error_key)
        else:
            # Default to field_name_required pattern
            key = f"error_messages.{field_name}_required"
            return error_response(language, key, default_message=f"{field_name} is required")
    return None


def handle_errors(func: Callable) -> Callable:
    """
    Decorator to handle exceptions in controller methods
    
    This decorator automatically catches exceptions and returns appropriate error responses,
    similar to Spring's @ExceptionHandler. It handles:
    - APIError and its subclasses (ValidationError, ProviderError, ServiceError)
    - Generic Exception
    
    Usage:
        @handle_errors
        def my_controller_method(self):
            # Your code here
            pass
    
    Args:
        func: Controller method to wrap
    
    Returns:
        Wrapped function with error handling
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except ValidationError as e:
            # Validation errors are expected, log as warning
            logger.warning(f"Validation error in {func.__name__}: {e.message}")
            return jsonify(e.to_dict()), e.status_code
        except ProviderError as e:
            # Provider errors indicate external service issues
            logger.error(f"Provider error in {func.__name__} ({e.provider}): {e.message}")
            return jsonify(e.to_dict()), e.status_code
        except ServiceError as e:
            # Service errors indicate internal service issues
            logger.error(f"Service error in {func.__name__} ({e.service_name or 'unknown'}): {e.message}")
            return jsonify(e.to_dict()), e.status_code
        except APIError as e:
            # Other API errors
            logger.error(f"API error in {func.__name__}: {e.message}")
            return jsonify(e.to_dict()), e.status_code
        except Exception as e:
            # Unexpected errors - log with full traceback
            logger.error(f"Unexpected error in {func.__name__}: {str(e)}", exc_info=True)
            error = APIError(
                f"Server error: {str(e)}",
                status_code=500
            )
            return jsonify(error.to_dict()), 500
    
    return wrapper

