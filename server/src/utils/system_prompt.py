"""
System Prompt generator
Generate System Prompt based on user settings
"""
from typing import Optional, List, Dict
from utils.logger import get_logger
from utils.prompt_template_loader import PromptTemplateLoader

logger = get_logger(__name__)


def build_system_prompt(
    background: Optional[str] = None,
    characters: Optional[List[str]] = None,
    character_personality: Optional[Dict[str, str]] = None,
    outline: Optional[str] = None,
    summary: Optional[str] = None,
    current_section: Optional[int] = None,
    total_sections: Optional[int] = None,
    appeared_characters: Optional[List[Dict]] = None,
    supplement: Optional[str] = None,
    language: str = 'zh'
) -> str:
    """
    Build System Prompt
    
    Args:
        background: Story background
        characters: Character list
        character_personality: Character personality dictionary
        outline: Story outline
        summary: Story summary (if exists, used to reduce tokens)
        current_section: Current section number
        total_sections: Total sections number
        appeared_characters: List of appeared characters
        supplement: Additional settings/supplement
        language: Language code ('zh' or 'en'), defaults to 'zh'
    
    Returns:
        Complete System Prompt string
    """
    template = PromptTemplateLoader.get_template(language)
    prompt_parts = []
    
    prompt_parts.extend(template['introduction'])
    
    if background:
        prompt_parts.append(template['sections']['background'])
        prompt_parts.append(background)
        prompt_parts.append("")
    
    if characters:
        prompt_parts.append(template['sections']['characters'])
        for i, char in enumerate(characters, 1):
            personality = character_personality.get(char, '') if character_personality else ''
            if personality:
                prompt_parts.append(f"{i}. **{char}** - {personality}")
            else:
                prompt_parts.append(f"{i}. **{char}**")
        prompt_parts.append("")
        prompt_parts.append(template['character_important_note'])
        prompt_parts.append("")
    
    # Add appeared characters information
    if appeared_characters:
        appeared_template = template.get('appeared_characters', {})
        prompt_parts.append(template['sections']['appeared_characters'])
        available_chars = [c for c in appeared_characters if not c.get('is_unavailable', False)]
        unavailable_chars = [c for c in appeared_characters if c.get('is_unavailable', False)]
        
        if available_chars:
            prompt_parts.append(appeared_template.get('available_label', '**Available Characters**:'))
            for char in available_chars:
                char_name = char.get('name', '')
                is_main = char.get('is_main', False)
                is_auto = char.get('is_auto_generated', False)
                main_label = appeared_template.get('main_label', ' (Main)') if is_main else ""
                auto_label = appeared_template.get('auto_generated_label', ' (Auto-generated)') if is_auto else ""
                prompt_parts.append(f"- {char_name}{main_label}{auto_label}")
            prompt_parts.append("")
        
        if unavailable_chars:
            prompt_parts.append(appeared_template.get('unavailable_label', '**Unavailable Characters**:'))
            for char in unavailable_chars:
                char_name = char.get('name', '')
                notes = char.get('notes', '')
                note_text = f" ({notes})" if notes else ""
                prompt_parts.append(f"- {char_name}{note_text}")
            prompt_parts.append("")
    
    if outline:
        prompt_parts.append(template['sections']['outline'])
        prompt_parts.append(outline)
        prompt_parts.append("")
        
        if current_section is not None and total_sections is not None:
            outline_template = template['outline']['with_progress']
            progress_text = outline_template['progress'].format(
                current_section=current_section + 1,
                total_sections=total_sections
            )
            prompt_parts.append(progress_text)
            prompt_parts.append("")
            prompt_parts.append(outline_template['title'])
            prompt_parts.extend(outline_template['instructions'])
            prompt_parts.append("")
        else:
            prompt_parts.append(template['outline']['without_progress'])
            prompt_parts.append("")
    
    if summary:
        prompt_parts.append(template['sections']['summary'])
        prompt_parts.append(template['summary']['intro'])
        prompt_parts.append(summary)
        prompt_parts.append("")
        prompt_parts.append(template['summary']['important_note'])
        prompt_parts.append("")
    
    if supplement:
        supplement_section = template['sections'].get('supplement', '## Additional Settings')
        prompt_parts.append(supplement_section)
        prompt_parts.append(supplement)
        prompt_parts.append("")
    
    guidelines = template['creative_guidelines']
    prompt_parts.append(guidelines['title'])
    prompt_parts.extend(guidelines['items'])
    prompt_parts.append("")
    
    feedback = template['feedback_handling']
    prompt_parts.append(feedback['title'])
    prompt_parts.append(feedback['intro'])
    prompt_parts.extend(feedback['items'])
    prompt_parts.append("")
    
    output = template['output_requirements']
    prompt_parts.append(output['title'])
    output_items = output['items'].copy()
    if current_section is None:
        # Remove the last item about section generation if no section info
        # Get keyword from template based on language
        section_generation_keyword = output.get('section_generation_keyword', '')
        if section_generation_keyword:
            output_items = [item for item in output_items if section_generation_keyword not in item]
    prompt_parts.extend(output_items)
    
    # Add character changes instructions
    if 'character_changes' in output:
        char_changes = output['character_changes']
        prompt_parts.append("")
        prompt_parts.append(char_changes['intro'])
        prompt_parts.extend(char_changes['instructions'])
    
    return "\n".join(prompt_parts)


def build_feedback_prompt(
    user_feedback: str,
    previous_content: Optional[str] = None,
    language: str = 'zh'
) -> str:
    """
    Build feedback processing prompt
    
    Args:
        user_feedback: User feedback content
        previous_content: Previous content (if rewrite is needed)
        language: Language code ('zh' or 'en'), defaults to 'zh'
    
    Returns:
        Feedback processing prompt
    """
    template = PromptTemplateLoader.get_template(language)
    feedback_template = template['feedback_prompt']
    prompt_parts = []
    
    prompt_parts.append(feedback_template['intro'])
    prompt_parts.append(user_feedback)
    prompt_parts.append("")
    
    feedback_lower = user_feedback.lower()
    # Get keywords from template based on language
    rewrite_keywords = feedback_template['types']['rewrite'].get('keywords', [])
    modify_keywords = feedback_template['types']['modify'].get('keywords', [])
    
    if any(keyword in feedback_lower for keyword in rewrite_keywords):
        op_type = feedback_template['types']['rewrite']
        prompt_parts.append(op_type['label'])
        if previous_content:
            prompt_parts.append("")
            prompt_parts.append(op_type['content_label'])
            prompt_parts.append(previous_content)
            prompt_parts.append("")
            prompt_parts.append(op_type['instruction'])
    elif any(keyword in feedback_lower for keyword in modify_keywords):
        op_type = feedback_template['types']['modify']
        prompt_parts.append(op_type['label'])
        if previous_content:
            prompt_parts.append("")
            prompt_parts.append(op_type['content_label'])
            prompt_parts.append(previous_content)
            prompt_parts.append("")
            prompt_parts.append(op_type['instruction'])
    else:
        op_type = feedback_template['types']['continue']
        prompt_parts.append(op_type['label'])
        prompt_parts.append(op_type['instruction'])
    
    return "\n".join(prompt_parts)

