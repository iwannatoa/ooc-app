# -*- mode: python ; coding: utf-8 -*-
import os
from pathlib import Path
from PyInstaller.utils.hooks import collect_submodules

# Get current directory (where spec file is located)
current_dir = Path(os.path.dirname(os.path.abspath(SPEC)))

# Automatically collect all submodules under src package
src_modules = collect_submodules('src')

a = Analysis(
    [os.path.join(current_dir, 'src', 'app.py')],
    pathex=[str(current_dir)],
    binaries=[],
    datas=[
        (os.path.join(current_dir, 'requirements.txt'), '.'),
        (os.path.join(current_dir, 'src', 'utils', 'prompt_templates'), 'utils/prompt_templates'),
    ],
    hiddenimports=[
        # Flask related
        'flask',
        'flask_cors',
        'flask_injector',
        'injector',
        # Request library
        'requests',
        # SQLAlchemy related
        'sqlalchemy',
        'sqlalchemy.dialects.sqlite',
        # Source code modules (automatically collect all submodules)
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
    onefile=True,
)
