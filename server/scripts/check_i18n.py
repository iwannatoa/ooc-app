#!/usr/bin/env python3
"""
Check for hardcoded Chinese strings in Python code (excluding comments and JSON files).
This script checks if Chinese characters are used in string literals that should be i18n.
"""
import re
import sys
from pathlib import Path
from typing import List, Tuple

# Unicode range for Chinese characters
CHINESE_PATTERN = re.compile(r'[\u4e00-\u9fa5]+')


def check_file(file_path: Path) -> List[Tuple[int, str, str]]:
    """Check a single Python file for hardcoded Chinese strings."""
    issues = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except UnicodeDecodeError:
        return issues  # Skip binary files
    
    in_string = False
    string_char = None  # ' or " or """
    for line_num, line in enumerate(lines, 1):
        i = 0
        while i < len(line):
            char = line[i]
            
            # Handle string literals
            if char in ('"', "'"):
                # Check for triple quotes
                if i + 2 < len(line) and line[i:i+3] == char * 3:
                    if not in_string or string_char != char * 3:
                        in_string = True
                        string_char = char * 3
                        i += 3
                    else:
                        in_string = False
                        string_char = None
                        i += 3
                    continue
                elif not in_string:
                    in_string = True
                    string_char = char
                    i += 1
                elif string_char == char:
                    in_string = False
                    string_char = None
                    i += 1
                else:
                    i += 1
            elif char == '\\' and in_string:
                i += 2  # Skip escaped character
                continue
            elif in_string:
                # Check for Chinese characters in strings
                if CHINESE_PATTERN.search(char):
                    # Check if this is a docstring (likely okay) or a regular string
                    # Docstrings usually start at the beginning of a line or after def/class
                    if string_char == '"""' or string_char == "'''":
                        # Allow Chinese in docstrings
                        i += 1
                        continue
                    
                    # Allow Chinese in Column comment parameter (database field comments)
                    # These are metadata for database schema
                    line_before = lines[line_num - 1] if line_num > 0 else ''
                    if 'comment=' in line_before or 'comment=' in line:
                        i += 1
                        continue
                    
                    # Find the full string context
                    start = line.rfind(string_char, 0, i) if string_char in ('"', "'") else -1
                    if start == -1:
                        # Multi-line string, get from current position
                        context = line[max(0, i-20):i+20]
                    else:
                        end = line.find(string_char, start + len(string_char))
                        if end != -1:
                            context = line[start:end+len(string_char)]
                        else:
                            context = line[max(0, i-20):i+20]
                    
                    issues.append((
                        line_num,
                        context.strip(),
                        f"Hardcoded Chinese string found (should use i18n): {context.strip()}"
                    ))
                    # Skip to end of line or end of string
                    while i < len(line) and (in_string or line[i] != '\n'):
                        if line[i] == string_char and (string_char not in ('"""', "'''") or line[i:i+3] == string_char * 3):
                            break
                        i += 1
                    continue
            
            i += 1
    
    return issues


def check_comments(file_path: Path) -> List[Tuple[int, str, str]]:
    """Check for Chinese characters in comments (should be English)."""
    issues = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except UnicodeDecodeError:
        return issues
    
    for line_num, line in enumerate(lines, 1):
        # Find comments (everything after #)
        comment_match = re.search(r'#(.+)', line)
        if comment_match:
            comment_text = comment_match.group(1)
            if CHINESE_PATTERN.search(comment_text):
                issues.append((
                    line_num,
                    comment_text.strip(),
                    f"Chinese comment found (should be in English): {comment_text.strip()}"
                ))
    
    return issues


def main():
    """Main function to check all Python files."""
    server_dir = Path(__file__).parent.parent
    src_dir = server_dir / 'src'
    
    if not src_dir.exists():
        print(f"Error: {src_dir} does not exist", file=sys.stderr)
        sys.exit(1)
    
    i18n_issues = []
    comment_issues = []
    
    # Get all Python files
    python_files = list(src_dir.rglob('*.py'))
    
    for py_file in python_files:
        # Skip __pycache__, test files, and scripts directory
        if '__pycache__' in str(py_file) or 'test' in str(py_file) or 'scripts' in str(py_file):
            continue
        
        # Check for hardcoded Chinese strings
        file_i18n_issues = check_file(py_file)
        if file_i18n_issues:
            i18n_issues.extend([(py_file, issue) for issue in file_i18n_issues])
        
        # Check for Chinese comments
        file_comment_issues = check_comments(py_file)
        if file_comment_issues:
            comment_issues.extend([(py_file, issue) for issue in file_comment_issues])
    
    # Report issues
    has_errors = False
    
    if i18n_issues:
        has_errors = True
        print("\n=== I18n Issues (Hardcoded Chinese Strings) ===")
        for file_path, (line_num, context, message) in i18n_issues:
            rel_path = file_path.relative_to(server_dir)
            print(f"{rel_path}:{line_num}: {message}")
            print(f"  Context: {context[:100]}")
    
    if comment_issues:
        has_errors = True
        print("\n=== Comment Issues (Chinese Comments) ===")
        for file_path, (line_num, context, message) in comment_issues:
            rel_path = file_path.relative_to(server_dir)
            print(f"{rel_path}:{line_num}: {message}")
            print(f"  Context: {context[:100]}")
    
    if not has_errors:
        print("✓ No i18n or comment issues found")
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == '__main__':
    main()

