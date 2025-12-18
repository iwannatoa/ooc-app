"""
自定义异常类
"""


class APIError(Exception):
    """API 基础异常类"""
    
    def __init__(self, message: str, status_code: int = 500, error_code: str = None):
        """
        初始化 API 异常
        
        Args:
            message: 错误消息
            status_code: HTTP 状态码
            error_code: 错误代码
        """
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
    
    def to_dict(self) -> dict:
        """转换为字典格式"""
        result = {
            'success': False,
            'error': self.message
        }
        if self.error_code:
            result['error_code'] = self.error_code
        return result


class ValidationError(APIError):
    """验证错误异常"""
    
    def __init__(self, message: str, field: str = None):
        """
        初始化验证错误
        
        Args:
            message: 错误消息
            field: 出错的字段名
        """
        super().__init__(message, status_code=400, error_code='VALIDATION_ERROR')
        self.field = field


class ServiceError(APIError):
    """服务错误异常"""
    
    def __init__(self, message: str, service_name: str = None, status_code: int = 500):
        """
        初始化服务错误
        
        Args:
            message: 错误消息
            service_name: 服务名称
            status_code: HTTP 状态码
        """
        super().__init__(message, status_code=status_code, error_code='SERVICE_ERROR')
        self.service_name = service_name


class ProviderError(ServiceError):
    """AI 提供商错误异常"""
    
    def __init__(self, message: str, provider: str, status_code: int = 500):
        """
        初始化提供商错误
        
        Args:
            message: 错误消息
            provider: 提供商名称
            status_code: HTTP 状态码
        """
        super().__init__(message, service_name=provider, status_code=status_code)
        self.provider = provider
        self.error_code = 'PROVIDER_ERROR'

