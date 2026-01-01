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
    pathex=[str(current_dir), str(current_dir / 'src')],
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
        # Source code modules - explicitly include all packages
        'config',
        'config.config',
        'utils',
        'utils.logger',
        'utils.i18n',
        'utils.exceptions',
        'utils.controller_helpers',
        'utils.stream_response',
        'utils.system_prompt',
        'utils.prompt_template_loader',
        'utils.db_path',
        'di',
        'di.module',
        'controller',
        'controller.chat_controller',
        'controller.settings_controller',
        'service',
        'service.ai_service',
        'service.ai_service_streaming',
        'service.ai_config_service',
        'service.chat_service',
        'service.chat_orchestration_service',
        'service.conversation_service',
        'service.story_service',
        'service.story_generation_service',
        'service.character_service',
        'service.summary_service',
        'service.summary_orchestration_service',
        'service.ollama_service',
        'service.deepseek_service',
        'service.app_settings_service',
        'repository',
        'repository.chat_repository',
        'repository.conversation_repository',
        'repository.character_record_repository',
        'repository.ai_config_repository',
        'repository.app_settings_repository',
        'repository.story_progress_repository',
        'repository.summary_repository',
        'model',
        'model.chat_record',
        'model.conversation_settings',
        'model.conversation_summary',
        'model.character_record',
        'model.ai_config',
        'model.app_settings',
        'model.story_progress',
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
