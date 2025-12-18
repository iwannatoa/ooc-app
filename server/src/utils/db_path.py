"""
数据库路径工具
"""
import os
from pathlib import Path
from src.utils.logger import get_logger

logger = get_logger(__name__)


def get_database_path() -> str:
    """
    获取数据库路径
    
    优先级：
    1. 环境变量 DB_PATH
    2. 尝试从 Tauri 获取（如果 Tauri 服务可用）
    3. 默认路径（server/data/chat.db）
    
    Returns:
        数据库文件路径
    """
    # 1. 检查环境变量
    db_path = os.getenv('DB_PATH')
    if db_path:
        logger.info(f"Using database path from environment: {db_path}")
        return db_path
    
    # 2. 尝试从 Tauri 获取（通过 HTTP API）
    # 注意：这需要 Tauri 应用已经启动并暴露了获取路径的 API
    # 由于 Flask 和 Tauri 是独立进程，这里使用默认路径
    # 实际路径应该由 Tauri 在启动 Flask 时通过环境变量传递
    
    # 3. 使用默认路径
    default_dir = Path(__file__).parent.parent.parent / 'data'
    default_dir.mkdir(parents=True, exist_ok=True)
    db_path = str(default_dir / 'chat.db')
    
    logger.info(f"Using default database path: {db_path}")
    return db_path

