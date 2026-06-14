# Copyright © 2016-2025 Patrick Zhang.
# All Rights Reserved.
"""
Startup script - convenient way to run the app from server directory
"""
import sys
import os
import time
import threading
import signal
import ctypes
from pathlib import Path

# Set UTF-8 encoding for stdout/stderr to support Chinese characters
# This must be done before any imports that might use logging
if sys.platform == 'win32':
    # On Windows, set default encoding to UTF-8
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    if hasattr(sys.stderr, 'reconfigure'):
        try:
            sys.stderr.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    # Set environment variable for subprocesses
    os.environ['PYTHONIOENCODING'] = 'utf-8'

# Add server/src to Python path
server_dir = Path(__file__).parent
src_dir = server_dir / 'src'
if str(src_dir) not in sys.path:
    sys.path.insert(0, str(src_dir))

# Development mode: set DB_PATH environment variable
# If FLASK_ENV is not set, default to development mode
if not os.getenv('FLASK_ENV'):
    os.environ['FLASK_ENV'] = 'development'

# Enable debug logging in development mode
# This allows logger.debug() to work in dev mode
if not os.getenv('LOG_LEVEL_DEBUG'):
    is_dev = os.getenv('FLASK_ENV', '').lower() == 'development' or \
             os.getenv('FLASK_DEBUG', '').lower() == 'true' or \
             os.getenv('DEV', '').lower() == 'true'
    if is_dev:
        os.environ['LOG_LEVEL_DEBUG'] = 'true'

if not os.getenv('DB_PATH'):
    is_dev = os.getenv('FLASK_ENV', '').lower() == 'development' or \
             os.getenv('FLASK_DEBUG', '').lower() == 'true' or \
             os.getenv('DEV', '').lower() == 'true'
    
    if is_dev:
        local_db_dir = server_dir / 'data' / 'local'
        local_db_dir.mkdir(parents=True, exist_ok=True)
        local_db_path = str(local_db_dir / 'chat.db')
        os.environ['DB_PATH'] = local_db_path
        print(f"Development mode: Using database at {local_db_path}")

# Import and run the app
import socket
from werkzeug.serving import make_server
from app import app, config, logger
import app as app_module  # Import app module to set _server_instance


def _is_process_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    if sys.platform == 'win32':
        PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
        STILL_ACTIVE = 259
        handle = ctypes.windll.kernel32.OpenProcess(
            PROCESS_QUERY_LIMITED_INFORMATION, False, pid
        )
        if handle:
            try:
                exit_code = ctypes.c_ulong()
                ok = ctypes.windll.kernel32.GetExitCodeProcess(
                    handle, ctypes.byref(exit_code)
                )
                if ok:
                    return int(exit_code.value) == STILL_ACTIVE
                return False
            finally:
                ctypes.windll.kernel32.CloseHandle(handle)
        return False
    try:
        # On both Windows and POSIX, this raises when pid does not exist.
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def _start_parent_watchdog(parent_pid: int) -> None:
    def _watch() -> None:
        while True:
            time.sleep(2.0)
            if not _is_process_alive(parent_pid):
                logger.warning(
                    "Detected dead Tauri parent process (pid=%s), exiting Flask.",
                    parent_pid,
                )
                os.kill(os.getpid(), signal.SIGTERM)
                return

    threading.Thread(target=_watch, name="tauri-parent-watchdog", daemon=True).start()

if __name__ == '__main__':
    parent_pid_raw = os.getenv('TAURI_PARENT_PID', '').strip()
    if parent_pid_raw.isdigit():
        _start_parent_watchdog(int(parent_pid_raw))

    requested_port = int(os.getenv('FLASK_PORT', '0'))
    if requested_port == 0:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.bind(('', 0))
        requested_port = s.getsockname()[1]
        s.close()
    
    server = make_server(config.HOST, requested_port, app)
    actual_port = server.server_port
    
    # Store server instance in app module for shutdown API
    app_module._server_instance = server
    
    print(f"FLASK_PORT:{actual_port}", flush=True)
    
    logger.info("Starting Flask server...")
    logger.info(f"Environment: {config.__class__.__name__}")
    logger.info(f"Host: {config.HOST}, Port: {actual_port}")
    logger.info(f"Debug: {config.DEBUG}")
    if os.getenv('DB_PATH'):
        logger.info(f"Database path: {os.getenv('DB_PATH')}")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("=" * 60)
        logger.info("Flask server received interrupt signal, shutting down...")
        logger.info("=" * 60)
        server.shutdown()
        logger.info("Server shutdown completed")

