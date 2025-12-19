"""
Unit tests for system_prompt module
"""
import pytest
import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from utils.system_prompt import build_system_prompt, build_feedback_prompt


class TestSystemPrompt:
    """Test system prompt building"""
    
    def test_build_system_prompt_minimal(self):
        """Test building minimal system prompt"""
        prompt = build_system_prompt(language='zh')
        
        assert prompt is not None
        assert len(prompt) > 0
    
    def test_build_system_prompt_with_background(self):
        """Test building prompt with background"""
        prompt = build_system_prompt(
            background='A fantasy world with magic',
            language='en'
        )
        
        assert 'fantasy' in prompt.lower() or 'background' in prompt.lower()
    
    def test_build_system_prompt_with_characters(self):
        """Test building prompt with characters"""
        prompt = build_system_prompt(
            characters=['Alice', 'Bob'],
            language='en'
        )
        
        assert 'Alice' in prompt or 'Bob' in prompt or 'character' in prompt.lower()
    
    def test_build_system_prompt_with_outline(self):
        """Test building prompt with outline"""
        prompt = build_system_prompt(
            outline='Chapter 1: Introduction',
            language='en'
        )
        
        assert len(prompt) > 0
    
    def test_build_system_prompt_with_appeared_characters(self):
        """Test building prompt with appeared characters"""
        appeared_chars = [
            {'name': 'Alice', 'is_main': True, 'is_unavailable': False},
            {'name': 'Bob', 'is_main': False, 'is_unavailable': True}
        ]
        
        prompt = build_system_prompt(
            appeared_characters=appeared_chars,
            language='en'
        )
        
        assert 'Alice' in prompt or 'character' in prompt.lower()
    
    def test_build_feedback_prompt(self):
        """Test building feedback prompt"""
        prompt = build_feedback_prompt(
            user_feedback='Make it more exciting',
            language='en'
        )
        
        assert 'exciting' in prompt.lower() or 'feedback' in prompt.lower()
    
    def test_build_feedback_prompt_with_previous_content(self):
        """Test building feedback prompt with previous content"""
        prompt = build_feedback_prompt(
            user_feedback='Rewrite this section',
            previous_content='Original content here',
            language='en'
        )
        
        assert len(prompt) > 0

