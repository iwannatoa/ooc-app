#!/usr/bin/env python3
"""
Fix Chinese comments to English in Python files
"""
import re
from pathlib import Path

# Translation mapping for common comment patterns
TRANSLATIONS = {
    r'# 创建数据库引擎': '# Create database engine',
    r'# 创建会话工厂': '# Create session factory',
    r'# 创建表（如果不存在）': '# Create tables (if not exist)',
    r'# 更新现有进度': '# Update existing progress',
    r'# 创建新进度': '# Create new progress',
    r'# 更新现有配置': '# Update existing configuration',
    r'# 创建新配置': '# Create new configuration',
    r'# 查找是否已存在总结': '# Check if summary already exists',
    r'# 使用 DISTINCT 获取唯一的会话ID': '# Use DISTINCT to get unique conversation IDs',
    r'# 添加索引': '# Add index',
    r'# 如果有消息历史，添加历史对话': '# Add message history if available',
    r'# 添加当前消息': '# Add current message',
    r'# 构建完整的 prompt': '# Build complete prompt',
    r'# 使用自定义 URL 或默认 URL': '# Use custom URL or default URL',
    r'# 获取现有进度': '# Get existing progress',
    r'# 如果大纲未确认，不能生成': '# Cannot generate if outline is not confirmed',
    r'# 如果状态是 pending 或 completed，可以生成下一部分': '# Can generate next section if status is pending or completed',
    r'# 确保每个 provider 只有一条记录': '# Ensure only one record per provider',
    r'# 只在明确要求时返回 API Key': '# Return API Key only when explicitly requested',
    r'# 配置字典': '# Configuration dictionary',
    r'# 大纲确认后，可以开始生成': '# Can start generation after outline is confirmed',
    r'# SQLite 允许多线程': '# SQLite allows multi-threading',
}

def fix_file(file_path: Path):
    """Fix Chinese comments in a single file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        return False
    
    original_content = content
    
    # Apply translations
    for pattern, replacement in TRANSLATIONS.items():
        content = re.sub(pattern, replacement, content)
    
    # Fix inline comments with Chinese (after code)
    # Pattern: code # Chinese comment
    def fix_inline_comment(match):
        code = match.group(1)
        comment = match.group(2)
        # Skip if comment is in Column comment parameter (database field comments)
        if 'comment=' in code:
            return match.group(0)
        # Translate common patterns
        for pattern, replacement in TRANSLATIONS.items():
            if pattern.replace('# ', '') in comment:
                return f"{code} # {replacement.replace('# ', '')}"
        return match.group(0)
    
    # Only fix if content changed
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    """Main function."""
    server_dir = Path(__file__).parent.parent
    src_dir = server_dir / 'src'
    
    if not src_dir.exists():
        print(f"Error: {src_dir} does not exist", file=sys.stderr)
        sys.exit(1)
    
    python_files = list(src_dir.rglob('*.py'))
    fixed_count = 0
    
    for py_file in python_files:
        # Skip __pycache__, test files, and scripts directory
        if '__pycache__' in str(py_file) or 'test' in str(py_file) or 'scripts' in str(py_file):
            continue
        
        if fix_file(py_file):
            fixed_count += 1
            print(f"Fixed: {py_file.relative_to(server_dir)}")
    
    print(f"\nFixed {fixed_count} files")

if __name__ == '__main__':
    import sys
    main()

