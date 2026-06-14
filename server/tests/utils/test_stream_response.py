"""Tests for SSE stream helper persist_metadata frame."""
import json
import sys
from pathlib import Path

from flask import Flask

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'src'))

from utils.stream_response import create_stream_response

_app = Flask(__name__)


def _collect_sse_body(resp) -> str:
    parts = []
    for chunk in resp.response:
        parts.append(chunk.decode('utf-8') if isinstance(chunk, bytes) else chunk)
    return ''.join(parts)


def test_persist_failed_frame_before_done():
    def gen():
        yield 'chunk1'

    meta = {}

    def on_complete(_acc):
        meta['persist_failed'] = 'save failed'

    with _app.test_request_context():
        resp = create_stream_response(
            stream_generator=gen(),
            on_complete=on_complete,
            persist_metadata=meta,
        )
        body = _collect_sse_body(resp)
    assert 'persist_failed' in body
    compact = body.replace(' ', '')
    assert '"done":true' in compact or '"done": true' in body
    # Order: content chunk, then persist_failed JSON line, then done
    lines = [ln for ln in body.split('\n') if ln.startswith('data: ')]
    payloads = []
    for ln in lines:
        payload = ln[6:].strip()
        if payload.startswith('{'):
            try:
                payloads.append(json.loads(payload))
            except json.JSONDecodeError:
                pass
    assert any(p.get('persist_failed') is True for p in payloads)
    assert any(p.get('done') is True for p in payloads)
    persist_idx = next(i for i, p in enumerate(payloads) if p.get('persist_failed'))
    done_idx = next(i for i, p in enumerate(payloads) if p.get('done'))
    assert persist_idx < done_idx


def test_parse_warnings_frame_before_done():
    def gen():
        yield "part1"
        yield json.dumps({"parse_warnings": ["characters_tag_unclosed"]}) + "\n"

    with _app.test_request_context():
        resp = create_stream_response(stream_generator=gen())
        body = _collect_sse_body(resp)

    lines = [ln for ln in body.split("\n") if ln.startswith("data: ")]
    payloads = []
    for ln in lines:
        payload = ln[6:].strip()
        if payload.startswith("{"):
            try:
                payloads.append(json.loads(payload))
            except json.JSONDecodeError:
                pass

    assert any(
        p.get("parse_warnings") == ["characters_tag_unclosed"] for p in payloads
    )
    assert any(p.get("done") is True for p in payloads)
    pw_idx = next(i for i, p in enumerate(payloads) if p.get("parse_warnings"))
    done_idx = next(i for i, p in enumerate(payloads) if p.get("done"))
    assert pw_idx < done_idx

