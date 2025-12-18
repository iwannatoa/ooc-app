# -*- mode: python ; coding: utf-8 -*-
import os
from pathlib import Path
from PyInstaller.utils.hooks import collect_submodules

# 获取当前目录（spec 文件所在目录）
current_dir = Path(os.path.dirname(os.path.abspath(SPEC)))

# 自动收集 src 包下的所有子模块
src_modules = collect_submodules('src')

a = Analysis(
    [os.path.join(current_dir, 'src', 'app.py')],
    pathex=[str(current_dir)],
    binaries=[],
    datas=[(os.path.join(current_dir, 'requirements.txt'), '.')],
    hiddenimports=[
        # Flask 相关
        'flask',
        'flask_cors',
        'flask_injector',
        'injector',
        # 请求库
        'requests',
        # 源代码模块（自动收集所有子模块）
    ] + src_modules,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='flask-api',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
