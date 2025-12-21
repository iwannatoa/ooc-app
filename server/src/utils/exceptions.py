"""
Custom exception classes
"""


class APIError(Exception):
    """API base exception class"""
    
    def __init__(self, message: str, status_code: int = 500, error_code: str = None):
        """
        Initialize API exception
        
        Args:
            message: Error message
            status_code: HTTP status code
            error_code: Error code
        """
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
    
    def to_dict(self) -> dict:
        """Convert to dictionary format"""
        result = {
            'success': False,
            'error': self.message
        }
        if self.error_code:
            result['error_code'] = self.error_code
        return result


class ValidationError(APIError):
    """Validation error exception"""
    
    def __init__(self, message: str, field: str = None):
        """
        Initialize validation error
        
        Args:
            message: Error message
            field: Field name that caused error
        """
        super().__init__(message, status_code=400, error_code='VALIDATION_ERROR')
        self.field = field


class ServiceError(APIError):
    """Service error exception"""
    
    def __init__(self, message: str, service_name: str = None, status_code: int = 500):
        """
        Initialize service error
        
        Args:
            message: Error message
            service_name: Service name
            status_code: HTTP status code
        """
        super().__init__(message, status_code=status_code, error_code='SERVICE_ERROR')
        self.service_name = service_name


class ProviderError(ServiceError):
    """AI provider error exception"""
    
    def __init__(self, message: str, provider: str, status_code: int = 500):
        """
        Initialize provider error
        
        Args:
            message: Error message
            provider: Provider name
            status_code: HTTP status code
        """
        super().__init__(message, service_name=provider, status_code=status_code)
        self.provider = provider
        self.error_code = 'PROVIDER_ERROR'

