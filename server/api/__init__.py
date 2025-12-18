"""
API 路由模块
"""
from flask import Blueprint

# 创建 API 蓝图
api_bp = Blueprint('api', __name__, url_prefix='/api')

# 导入路由（必须在蓝图创建后导入）
from . import routes

__all__ = ['api_bp']

