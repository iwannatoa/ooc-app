"""
Tests for provider multimodal normalization policy.
"""
import sys
from pathlib import Path


# Add src to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'src'))

from infrastructure.provider_capabilities import apply_provider_multimodal_policy


def test_ollama_downgrades_multimodal_message_parts():
    result = apply_provider_multimodal_policy(
        provider='ollama',
        message='hello',
        message_parts=[
            {'type': 'text', 'content': 'hello'},
            {
                'type': 'image',
                'name': 'a.png',
                'mime_type': 'image/png',
                'size_bytes': 12,
            },
        ],
    )

    assert result.content_type == 'text'
    assert '[Multimodal attachments:' not in result.normalized_message
    assert result.provider_capability_notice
    assert 'does not support multimodal attachments' in result.provider_capability_notice


def test_deepseek_keeps_multimodal_marker_when_supported():
    result = apply_provider_multimodal_policy(
        provider='deepseek',
        message='hello',
        message_parts=[
            {'type': 'text', 'content': 'hello'},
            {
                'type': 'image',
                'name': 'a.png',
                'mime_type': 'image/png',
                'size_bytes': 12,
            },
        ],
    )

    assert result.content_type == 'multimodal'
    assert '[Multimodal attachments: 1]' in result.normalized_message
    assert result.provider_capability_notice is None
