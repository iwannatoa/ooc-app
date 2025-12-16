# build.py
import os
import sys
import subprocess
import platform
import shutil
from pathlib import Path

def get_tauri_binary_name(base_name: str) -> str:
    """根据平台生成 Tauri 期望的二进制文件名"""
    system = platform.system().lower()
    arch = platform.machine().lower()
    
    # 标准化架构名称
    if arch in ['x86_64', 'amd64']:
        arch = 'x86_64'
    elif arch in ['aarch64', 'arm64']:
        arch = 'aarch64'
    elif arch in ['i386', 'i686', 'x86']:
        arch = 'i686'
    else:
        arch = 'unknown'
    
    if system == "windows":
        return f"{base_name}-{arch}-pc-windows-msvc.exe"
    elif system == "darwin":  # macOS
        if arch == "x86_64":
            return f"{base_name}-{arch}-apple-darwin"
        else:  # aarch64
            return f"{base_name}-{arch}-apple-darwin"
    elif system == "linux":
        return f"{base_name}-{arch}-unknown-linux-gnu"
    else:
        return f"{base_name}-{system}-{arch}"

def build_for_platform(base_name: str, target_triple: str, output_suffix: str):
    """为特定平台构建可执行文件"""
    print(f"Building for {target_triple}...")
    
    current_dir = Path(__file__).parent
    origin_dir = current_dir / "dist"
    dist_dir = current_dir / "dist" / target_triple
    
    # 清理之前的构建
    if dist_dir.exists():
        shutil.rmtree(dist_dir)
    
    dist_dir.mkdir(parents=True, exist_ok=True)
    
    # PyInstaller 命令
    pyinstaller_cmd = [
        "pyinstaller",
        "--onefile",
        "--console",
        "--name", base_name,
        "--add-data", f"{os.path.join(current_dir, 'requirements.txt')};.",
        "--hidden-import", "flask",
        "--hidden-import", "flask_cors",
        "--hidden-import", "requests",
        "--clean", 
        os.path.join(current_dir, "app.py")
    ]

    try:
        subprocess.check_call(pyinstaller_cmd, cwd=current_dir)
        
        # 重命名文件以符合 Tauri 命名约定
        original_exe = origin_dir / f"{base_name}.exe" if sys.platform == "win32" else origin_dir / base_name
        new_name = f"{base_name}{output_suffix}"
        new_exe_path = dist_dir / new_name
        
        if original_exe.exists():
            original_exe.rename(new_exe_path)
            print(f"✓ Built: {new_name}")
            return new_exe_path
        else:
            print(f"✗ Build failed: {original_exe} not found")
            return None
            
    except subprocess.CalledProcessError as e:
        print(f"✗ Build failed for {target_triple}: {e}")
        return None

def build_all_platforms():
    """为所有支持的平台构建"""
    base_name = "flask-api"
    current_dir = Path(__file__).parent
    final_output_dir = current_dir / "../dist/server"
    
    # 支持的平台目标
    platforms = [
        # Windows
        ("x86_64-pc-windows-msvc", ".exe"),
        # macOS
        ("x86_64-apple-darwin", ""),
        ("aarch64-apple-darwin", ""),
        # Linux
        ("x86_64-unknown-linux-gnu", ""),
        ("aarch64-unknown-linux-gnu", ""),
    ]
    
    built_files = []
    
    for target_triple, extension in platforms:
        # 在实际构建中，你可能需要交叉编译工具链
        # 这里我们只构建当前平台
        if should_build_for_target(target_triple):
            output_file = build_for_platform(base_name, target_triple, extension)
            if output_file:
                built_files.append(output_file)
    
    # 复制当前平台的文件到根目录（供 Tauri 使用）
    current_platform_file = copy_current_platform_binary(base_name, final_output_dir)
    if current_platform_file:
        built_files.append(current_platform_file)
    
    return built_files

def should_build_for_target(target_triple: str) -> bool:
    """检查是否应该为指定目标构建"""
    current_system = platform.system().lower()
    current_arch = platform.machine().lower()
    
    # 简化逻辑：只构建当前平台
    # 在实际项目中，你可能需要设置交叉编译环境
    if "windows" in target_triple and current_system == "windows":
        return True
    elif "darwin" in target_triple and current_system == "darwin":
        return True
    elif "linux" in target_triple and current_system == "linux":
        return True
    
    return False

def copy_current_platform_binary(base_name: str, output_dir: Path) -> Path:
    """复制当前平台的二进制文件到输出目录"""
    current_platform_name = get_tauri_binary_name(base_name)
    current_dir = Path(__file__).parent
    
    # 查找当前平台的构建文件
    dist_patterns = [
        current_dir / "dist" / "**" / f"{base_name}*",
        current_dir / "dist" / f"{base_name}*",
        current_dir / "dist" / "**" / f"{base_name}.exe",
    ]
    
    source_file = None
    for pattern in dist_patterns:
        for file_path in current_dir.glob(str(pattern.relative_to(current_dir))):
            if file_path.is_file():
                source_file = file_path
                break
        if source_file:
            break
    
    if not source_file:
        # 如果没有找到，构建当前平台
        print("Building for current platform...")
        target_name = get_target_triple()
        source_file = build_for_platform(base_name, target_name, 
                                       ".exe" if sys.platform == "win32" else "")
    
    if source_file and source_file.exists():
        # 确保输出目录存在
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # 复制文件
        dest_file = output_dir / current_platform_name
        shutil.copy2(source_file, dest_file)
        print(f"✓ Copied to: {dest_file}")
        return dest_file
    
    return None

def get_target_triple() -> str:
    """获取当前平台的目标三元组"""
    system = platform.system().lower()
    arch = platform.machine().lower()
    
    if arch in ['x86_64', 'amd64']:
        arch = 'x86_64'
    elif arch in ['aarch64', 'arm64']:
        arch = 'aarch64'
    
    if system == "windows":
        return f"{arch}-pc-windows-msvc"
    elif system == "darwin":
        return f"{arch}-apple-darwin"
    elif system == "linux":
        return f"{arch}-unknown-linux-gnu"
    else:
        return f"{arch}-unknown-{system}"

def main():
    """主构建函数"""
    print("Building Flask API for multiple platforms...")
    
    current_dir = Path(__file__).parent
    
    # 安装依赖
    print("Installing Python dependencies...")
    requirements_file = current_dir / "requirements.txt"
    
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
        ])
    except subprocess.CalledProcessError as e:
        print(f"Warning: Failed to install dependencies: {e}")
    
    # 构建所有平台
    built_files = build_all_platforms()
    
    if built_files:
        print("\n✓ Build completed successfully!")
        print("Built files:")
        for file in built_files:
            print(f"  - {file}")
    else:
        print("\n✗ Build failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
