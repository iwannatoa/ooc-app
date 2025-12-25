# build.py
import os
import sys
import subprocess
import platform
import shutil
from pathlib import Path

def get_tauri_binary_name(base_name: str) -> str:
    """Generate binary filename expected by Tauri based on platform"""
    system = platform.system().lower()
    arch = platform.machine().lower()
    
    # Normalize architecture name
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
    """Build executable for specific platform"""
    print(f"Building for {target_triple}...")
    
    current_dir = Path(__file__).parent
    origin_dir = current_dir / "dist"
    dist_dir = current_dir / "dist" / target_triple
    
    # Clean previous build
    if dist_dir.exists():
        shutil.rmtree(dist_dir)
    
    dist_dir.mkdir(parents=True, exist_ok=True)
    
    # Build using spec file (clearer, centralized configuration)
    spec_file = current_dir / "flask-api.spec"
    pyinstaller_cmd = [
        "pyinstaller",
        "--clean",
        str(spec_file)
    ]

    try:
        subprocess.check_call(pyinstaller_cmd, cwd=current_dir)
        
        # Rename file to match Tauri naming convention
        original_exe = origin_dir / f"{base_name}.exe" if sys.platform == "win32" else origin_dir / base_name
        new_name = f"{base_name}{output_suffix}"
        new_exe_path = dist_dir / new_name
        
        if original_exe.exists():
            original_exe.rename(new_exe_path)
            print(f"[OK] Built: {new_name}")
            return new_exe_path
        else:
            print(f"✗ Build failed: {original_exe} not found")
            return None
            
    except subprocess.CalledProcessError as e:
        print(f"✗ Build failed for {target_triple}: {e}")
        return None

def build_all_platforms():
    """Build for all supported platforms"""
    base_name = "flask-api"
    current_dir = Path(__file__).parent
    final_output_dir = current_dir / "../dist/server"
    
    # Supported platform targets
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
        # In actual builds, you may need cross-compilation toolchain
        # Here we only build for current platform
        if should_build_for_target(target_triple):
            output_file = build_for_platform(base_name, target_triple, extension)
            if output_file:
                built_files.append(output_file)
    
    # Copy current platform file to root directory (for Tauri use)
    current_platform_file = copy_current_platform_binary(base_name, final_output_dir)
    if current_platform_file:
        built_files.append(current_platform_file)
    
    # Copy to Tauri resources directory for sidecar
    # Tauri expects platform-specific names: flask-api-{target-triple
    tauri_resources_dir = current_dir.parent / "src-tauri" / "resources"
    if current_platform_file:
        tauri_resources_dir.mkdir(parents=True, exist_ok=True)
        # Get the platform-specific name that Tauri expects
        target_triple = get_target_triple()
        tauri_sidecar_name = get_tauri_binary_name(base_name)
        tauri_sidecar_file = tauri_resources_dir / tauri_sidecar_name
        shutil.copy2(current_platform_file, tauri_sidecar_file)
        print(f"[OK] Copied to Tauri resources: {tauri_sidecar_file}")
        built_files.append(tauri_sidecar_file)
    
    return built_files

def should_build_for_target(target_triple: str) -> bool:
    """Check if should build for specified target"""
    current_system = platform.system().lower()
    current_arch = platform.machine().lower()
    
    # Simplified logic: only build for current platform
    # In actual projects, you may need to set up cross-compilation environment
    if "windows" in target_triple and current_system == "windows":
        return True
    elif "darwin" in target_triple and current_system == "darwin":
        return True
    elif "linux" in target_triple and current_system == "linux":
        return True
    
    return False

def copy_current_platform_binary(base_name: str, output_dir: Path) -> Path:
    """Copy current platform binary file to output directory"""
    current_platform_name = get_tauri_binary_name(base_name)
    current_dir = Path(__file__).parent
    
    # Find current platform build file
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
        # If not found, build for current platform
        print("Building for current platform...")
        target_name = get_target_triple()
        source_file = build_for_platform(base_name, target_name, 
                                       ".exe" if sys.platform == "win32" else "")
    
    if source_file and source_file.exists():
        # Ensure output directory exists
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy file
        dest_file = output_dir / current_platform_name
        shutil.copy2(source_file, dest_file)
        print(f"[OK] Copied to: {dest_file}")
        return dest_file
    
    return None

def get_target_triple() -> str:
    """Get current platform target triple"""
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
    """Main build function"""
    print("Building Flask API for multiple platforms...")
    
    current_dir = Path(__file__).parent
    
    # Install dependencies
    print("Installing Python dependencies...")
    requirements_file = current_dir / "requirements.txt"
    
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
        ])
    except subprocess.CalledProcessError as e:
        print(f"Warning: Failed to install dependencies: {e}")
    
    # Build all platforms
    built_files = build_all_platforms()
    
    if built_files:
        print("\n[OK] Build completed successfully!")
        print("Built files:")
        for file in built_files:
            print(f"  - {file}")
    else:
        print("\n✗ Build failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
