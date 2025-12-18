"""
启动脚本 - 方便从 server 目录运行应用
"""
import sys
from pathlib import Path

# 添加 server 目录到 Python 路径
server_dir = Path(__file__).parent
if str(server_dir) not in sys.path:
    sys.path.insert(0, str(server_dir))

# 导入并运行应用
from src.app import app, config, logger

if __name__ == '__main__':
    logger.info("Starting Flask server...")
    logger.info(f"Environment: {config.__class__.__name__}")
    logger.info(f"Host: {config.HOST}, Port: {config.PORT}")
    logger.info(f"Debug: {config.DEBUG}")
    
    app.run(
        host=config.HOST,
        port=config.PORT,
        debug=config.DEBUG,
        use_reloader=False
    )

