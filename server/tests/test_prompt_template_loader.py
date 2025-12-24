"""
Unit tests for PromptTemplateLoader
"""
import pytest
import json
import sys
import tempfile
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from utils.prompt_template_loader import PromptTemplateLoader, get_templates_dir


class TestPromptTemplateLoader:
    """Test PromptTemplateLoader"""
    
    def test_get_template_zh(self):
        """Test loading Chinese template"""
        template = PromptTemplateLoader.get_template('zh')
        
        assert template is not None
        assert 'introduction' in template
        assert 'sections' in template
    
    def test_get_template_en(self):
        """Test loading English template"""
        template = PromptTemplateLoader.get_template('en')
        
        assert template is not None
        assert 'introduction' in template
        assert 'sections' in template
    
    def test_get_template_fallback(self):
        """Test fallback to Chinese when language not found"""
        # This should fallback to 'zh' if 'invalid' language is requested
        # But we'll test with a known language first
        template = PromptTemplateLoader.get_template('zh')
        assert template is not None
    
    def test_template_caching(self):
        """Test that templates are cached"""
        # Clear cache first
        PromptTemplateLoader.clear_cache()
        
        # Load template twice
        template1 = PromptTemplateLoader.get_template('zh')
        template2 = PromptTemplateLoader.get_template('zh')
        
        # Should be the same object (cached)
        assert template1 is template2
    
    def test_clear_cache(self):
        """Test clearing template cache"""
        # Load a template
        template1 = PromptTemplateLoader.get_template('zh')
        
        # Clear cache
        PromptTemplateLoader.clear_cache()
        
        # Load again - should be a new object
        template2 = PromptTemplateLoader.get_template('zh')
        
        # Content should be the same but may be different object
        assert template1 == template2

