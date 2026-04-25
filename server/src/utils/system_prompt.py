"""
System Prompt generator
Generate System Prompt based on user settings
"""
from typing import Optional, List, Dict, Literal

from utils.logger import get_logger
from utils.prompt_template_loader import PromptTemplateLoader

logger = get_logger(__name__)

FeedbackOperation = Literal["rewrite", "modify"]


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
    language: str = "zh",
    *,
    context_kind: Literal["story_generate", "story_feedback"] = "story_generate",
    history_truncated: bool = False,
    older_via_summary: bool = False,
) -> str:
    """
    Build System Prompt

    Args:
        context_kind: ``story_generate`` omits generic in-system feedback instructions;
            ``story_feedback`` includes them (rewrite/modify rounds).
        history_truncated: When True, append a note that older turns may be missing from context.
        older_via_summary: When True, note that earlier plot is only via the summary block.
    """
    template = PromptTemplateLoader.get_template(language)
    prompt_parts: List[str] = []

    prompt_parts.extend(template["introduction"])

    shared = template.get("shared_story_constraints")
    if shared:
        prompt_parts.append(shared.get("title", ""))
        prompt_parts.extend(shared.get("items", []))
        prompt_parts.append("")

    if background:
        prompt_parts.append(template["sections"]["background"])
        prompt_parts.append(background)
        prompt_parts.append("")

    if characters:
        prompt_parts.append(template["sections"]["characters"])
        for i, char in enumerate(characters, 1):
            personality = character_personality.get(char, "") if character_personality else ""
            if personality:
                prompt_parts.append(f"{i}. {char} — {personality}")
            else:
                prompt_parts.append(f"{i}. {char}")
        prompt_parts.append("")
        prompt_parts.append(template["character_important_note"])
        prompt_parts.append("")

    if appeared_characters:
        appeared_template = template.get("appeared_characters", {})
        prompt_parts.append(template["sections"]["appeared_characters"])
        available_chars = [c for c in appeared_characters if not c.get("is_unavailable", False)]
        unavailable_chars = [c for c in appeared_characters if c.get("is_unavailable", False)]

        if available_chars:
            prompt_parts.append(
                appeared_template.get("available_label", "Available characters:")
            )
            for char in available_chars:
                char_name = char.get("name", "")
                is_main = char.get("is_main", False)
                is_auto = char.get("is_auto_generated", False)
                main_label = appeared_template.get("main_label", " (Main)") if is_main else ""
                auto_label = (
                    appeared_template.get("auto_generated_label", " (Auto-generated)")
                    if is_auto
                    else ""
                )
                prompt_parts.append(f"- {char_name}{main_label}{auto_label}")
            prompt_parts.append("")

        if unavailable_chars:
            prompt_parts.append(
                appeared_template.get("unavailable_label", "Unavailable characters:")
            )
            for char in unavailable_chars:
                char_name = char.get("name", "")
                notes = char.get("notes", "")
                note_text = f" ({notes})" if notes else ""
                prompt_parts.append(f"- {char_name}{note_text}")
            prompt_parts.append("")

    if outline:
        prompt_parts.append(template["sections"]["outline"])
        prompt_parts.append(outline)
        prompt_parts.append("")

        if current_section is not None and total_sections is not None:
            outline_template = template["outline"]["with_progress"]
            progress_text = outline_template["progress"].format(
                current_section=current_section + 1,
                total_sections=total_sections,
            )
            prompt_parts.append(progress_text)
            prompt_parts.append("")
            prompt_parts.append(outline_template["title"])
            prompt_parts.extend(outline_template["instructions"])
            prompt_parts.append("")
        elif current_section is not None and total_sections is None:
            open_tpl = template.get("outline", {}).get("open_ended")
            if open_tpl:
                progress_text = open_tpl["progress"].format(section=current_section + 1)
                prompt_parts.append(progress_text)
                prompt_parts.append("")
                prompt_parts.append(open_tpl["title"])
                prompt_parts.extend(open_tpl["instructions"])
                prompt_parts.append("")
            else:
                prompt_parts.append(template["outline"]["without_progress"])
                prompt_parts.append("")
        else:
            prompt_parts.append(template["outline"]["without_progress"])
            prompt_parts.append("")

    if summary:
        prompt_parts.append(template["sections"]["summary"])
        prompt_parts.append(template["summary"]["intro"])
        prompt_parts.append(summary)
        prompt_parts.append("")
        prompt_parts.append(template["summary"]["important_note"])
        prompt_parts.append("")

    if supplement:
        supplement_section = template["sections"].get("supplement", "## Additional Settings")
        prompt_parts.append(supplement_section)
        prompt_parts.append(supplement)
        prompt_parts.append("")

    guidelines = template["creative_guidelines"]
    prompt_parts.append(guidelines["title"])
    prompt_parts.extend(guidelines["items"])
    prompt_parts.append("")

    if context_kind == "story_feedback":
        feedback = template["feedback_handling"]
        prompt_parts.append(feedback["title"])
        prompt_parts.append(feedback["intro"])
        prompt_parts.extend(feedback["items"])
        prompt_parts.append("")

    output = template["output_requirements"]
    prompt_parts.append(output["title"])
    output_items = output["items"].copy()
    if current_section is None:
        section_generation_keyword = output.get("section_generation_keyword", "")
        if section_generation_keyword:
            output_items = [
                item for item in output_items if section_generation_keyword not in item
            ]
    prompt_parts.extend(output_items)

    if "character_changes" in output:
        char_changes = output["character_changes"]
        prompt_parts.append("")
        prompt_parts.append(char_changes["intro"])
        prompt_parts.extend(char_changes["instructions"])

    notes = template.get("context_notes", {})
    if history_truncated and notes.get("history_truncated"):
        prompt_parts.append("")
        prompt_parts.append(notes["history_truncated"])
    if older_via_summary and notes.get("older_via_summary"):
        prompt_parts.append("")
        prompt_parts.append(notes["older_via_summary"])

    return "\n".join(prompt_parts)


def build_feedback_prompt(
    user_feedback: str,
    previous_content: Optional[str] = None,
    language: str = "zh",
    forced_operation: Optional[FeedbackOperation] = None,
) -> str:
    """
    Build feedback processing prompt.

    Args:
        forced_operation: When ``rewrite`` or ``modify``, skip keyword detection (UI-driven).
    """
    template = PromptTemplateLoader.get_template(language)
    feedback_template = template["feedback_prompt"]
    prompt_parts: List[str] = []

    prompt_parts.append(feedback_template["intro"])
    prompt_parts.append(user_feedback)
    prompt_parts.append("")

    if forced_operation == "rewrite":
        op_type = feedback_template["types"]["rewrite"]
        prompt_parts.append(op_type["label"])
        if previous_content:
            prompt_parts.append("")
            prompt_parts.append(op_type["content_label"])
            prompt_parts.append(previous_content)
            prompt_parts.append("")
            prompt_parts.append(op_type["instruction"])
    elif forced_operation == "modify":
        op_type = feedback_template["types"]["modify"]
        prompt_parts.append(op_type["label"])
        if previous_content:
            prompt_parts.append("")
            prompt_parts.append(op_type["content_label"])
            prompt_parts.append(previous_content)
            prompt_parts.append("")
            prompt_parts.append(op_type["instruction"])
    else:
        feedback_lower = user_feedback.lower()
        rewrite_keywords = feedback_template["types"]["rewrite"].get("keywords", [])
        modify_keywords = feedback_template["types"]["modify"].get("keywords", [])

        if any(keyword in feedback_lower for keyword in rewrite_keywords):
            op_type = feedback_template["types"]["rewrite"]
            prompt_parts.append(op_type["label"])
            if previous_content:
                prompt_parts.append("")
                prompt_parts.append(op_type["content_label"])
                prompt_parts.append(previous_content)
                prompt_parts.append("")
                prompt_parts.append(op_type["instruction"])
        elif any(keyword in feedback_lower for keyword in modify_keywords):
            op_type = feedback_template["types"]["modify"]
            prompt_parts.append(op_type["label"])
            if previous_content:
                prompt_parts.append("")
                prompt_parts.append(op_type["content_label"])
                prompt_parts.append(previous_content)
                prompt_parts.append("")
                prompt_parts.append(op_type["instruction"])
        else:
            op_type = feedback_template["types"]["continue"]
            prompt_parts.append(op_type["label"])
            prompt_parts.append(op_type["instruction"])

    return "\n".join(prompt_parts)
