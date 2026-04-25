"""
Strip model "think" / reasoning blocks from assistant text before persistence or display.
"""
import re

# Block tags from common model families: Qwen-style redacted_thinking / thinking tags,
# generic reasoning tags, and plain think/close-think pairs (hex escapes for angle brackets).
_THINK_BLOCK_PATTERNS = (
    r'<think>.*?</think>',
    r'<thinking>.*?</thinking>',
    r'<reasoning>.*?</reasoning>',
    r'(?is)\x3cthink\x3e.*?\x3c/think\x3e',
)


def strip_think_content(text: str) -> str:
    """
    Remove think-style content from AI response text.

    Args:
        text: Raw model output.

    Returns:
        Text with think blocks removed and whitespace normalized.
    """
    for pat in _THINK_BLOCK_PATTERNS:
        text = re.sub(pat, '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'```think\s*\n.*?\n```', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'```think\s*```', '', text, flags=re.IGNORECASE)
    text = re.sub(r'```thinking\s*\n.*?\n```', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'```thinking\s*```', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
    return text.strip()
