"""LangChain message helpers (todo 1 / 4 bridge)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from infrastructure.langchain_messages import (
    dict_messages_to_base_messages,
    build_story_chat_prompt_runnable,
    chat_prompt_template_placeholder,
)


def test_dict_messages_to_base_messages_order():
    msgs = [
        {"role": "user", "content": "u1"},
        {"role": "assistant", "content": "a1"},
    ]
    out = dict_messages_to_base_messages("SYS", msgs, "final")
    assert isinstance(out[0], SystemMessage)
    assert out[0].content == "SYS"
    assert isinstance(out[1], HumanMessage)
    assert out[3].content == "final"


def test_build_story_chat_prompt_runnable():
    r = build_story_chat_prompt_runnable()
    out = r.invoke(
        {"system_prompt": "S", "messages": [{"role": "assistant", "content": "A"}], "message": "Q"}
    )
    assert isinstance(out[0], SystemMessage)
    assert isinstance(out[1], AIMessage)


def test_chat_prompt_template_placeholder_formats():
    tpl = chat_prompt_template_placeholder()
    msgs = tpl.format_messages(system_prompt="SYS", user_message="hi")
    assert len(msgs) == 2

