"""
Unit tests for system_prompt module
"""
import pytest
import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'src'))

from utils.system_prompt import build_system_prompt, build_feedback_prompt
from utils.prompt_template_loader import PromptTemplateLoader


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

    def test_story_generate_omits_feedback_handling_zh(self):
        prompt = build_system_prompt(
            outline="test",
            language="zh",
            context_kind="story_generate",
        )
        assert "## 反馈处理" not in prompt

    def test_story_feedback_includes_feedback_handling_zh(self):
        prompt = build_system_prompt(
            outline="test",
            language="zh",
            context_kind="story_feedback",
        )
        assert "## 反馈处理" in prompt

    def test_open_ended_outline_zh(self):
        prompt = build_system_prompt(
            outline="o",
            current_section=0,
            total_sections=None,
            language="zh",
        )
        assert "连载模式" in prompt
        assert "{total_sections}" not in prompt

    def test_finite_outline_shows_progress_zh(self):
        prompt = build_system_prompt(
            outline="o",
            current_section=1,
            total_sections=5,
            language="zh",
        )
        assert "2/5" in prompt or "第 2/5" in prompt

    def test_history_truncated_note_zh(self):
        prompt = build_system_prompt(
            language="zh",
            history_truncated=True,
        )
        assert "更早的对话未全部载入" in prompt

    def test_older_via_summary_note_zh(self):
        prompt = build_system_prompt(
            language="zh",
            older_via_summary=True,
        )
        assert "故事进展总结" in prompt

    def test_shared_constraints_heading_as_own_line_zh(self):
        """Shared block title is one line; other sections may cite the same phrase."""
        prompt = build_system_prompt(outline="x", language="zh")
        title = PromptTemplateLoader.get_template("zh")["shared_story_constraints"][
            "title"
        ]
        assert any(line.strip() == title for line in prompt.splitlines())

    def test_forced_modify_without_keywords_zh(self):
        prompt = build_feedback_prompt(
            "把语气改轻松一点",
            previous_content="old",
            language="zh",
            forced_operation="modify",
        )
        assert "**操作类型**：调整" in prompt
        assert "根据用户反馈进行调整" in prompt

    def test_forced_rewrite_without_keywords_en(self):
        prompt = build_feedback_prompt(
            "tighten pacing only",
            previous_content="old",
            language="en",
            forced_operation="rewrite",
        )
        assert "**Operation Type**: Rewrite" in prompt


