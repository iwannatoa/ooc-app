"""Request-scoped correlation context for structured logging."""

from __future__ import annotations

import uuid
from typing import Optional

from flask import g, has_request_context, request

MAX_JSON_PARSE_BYTES = 256 * 1024
MAX_FIELD_LEN = 128
MAX_CONVERSATION_ID_LEN = 160

PROFILE_HEADER = "X-OOC-Profile-Id"
CLIENT_REQUEST_HEADER = "X-OOC-Client-Request-Id"
REQUEST_ID_HEADER = "X-OOC-Request-Id"


def _normalize_field(value: object, max_len: int) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text[:max_len]


def _extract_conversation_id() -> Optional[str]:
    query_value = request.args.get("conversation_id") or request.args.get("conversationId")
    normalized_query = _normalize_field(query_value, MAX_CONVERSATION_ID_LEN)
    if normalized_query:
        return normalized_query

    if not request.is_json:
        return None

    content_length = request.content_length or 0
    if content_length > MAX_JSON_PARSE_BYTES:
        return None

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return None

    body_value = payload.get("conversation_id") or payload.get("conversationId")
    return _normalize_field(body_value, MAX_CONVERSATION_ID_LEN)


def register_request_context(app) -> None:
    @app.before_request
    def _inject_request_context() -> None:
        g.request_id = uuid.uuid4().hex
        g.profile_id = _normalize_field(
            request.headers.get(PROFILE_HEADER),
            MAX_FIELD_LEN,
        )
        g.client_request_id = _normalize_field(
            request.headers.get(CLIENT_REQUEST_HEADER),
            MAX_FIELD_LEN,
        )
        g.conversation_id = _extract_conversation_id()

    @app.after_request
    def _attach_request_id(response):
        request_id = getattr(g, "request_id", None)
        if request_id:
            response.headers.setdefault(REQUEST_ID_HEADER, request_id)
        return response


def current_request_log_context() -> dict[str, str]:
    if not has_request_context():
        return {
            "request_id": "-",
            "conversation_id": "-",
            "profile_id": "-",
            "client_request_id": "-",
        }

    return {
        "request_id": getattr(g, "request_id", None) or "-",
        "conversation_id": getattr(g, "conversation_id", None) or "-",
        "profile_id": getattr(g, "profile_id", None) or "-",
        "client_request_id": getattr(g, "client_request_id", None) or "-",
    }
