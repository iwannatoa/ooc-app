import logging
import uuid

from flask import Flask, jsonify

from middleware.request_context import (
    CLIENT_REQUEST_HEADER,
    PROFILE_HEADER,
    REQUEST_ID_HEADER,
    current_request_log_context,
    register_request_context,
)
from utils.logger import setup_logger


def _build_app() -> Flask:
    app = Flask(__name__)
    app.config["TESTING"] = True
    register_request_context(app)

    @app.route("/api/echo", methods=["GET", "POST"])
    def echo():
        return jsonify(current_request_log_context())

    return app


def test_injects_request_id_and_sets_response_header():
    app = _build_app()
    client = app.test_client()

    response = client.get("/api/echo")
    payload = response.get_json()

    assert response.status_code == 200
    assert payload["request_id"]
    assert response.headers.get(REQUEST_ID_HEADER) == payload["request_id"]
    uuid.UUID(payload["request_id"])


def test_extracts_conversation_and_profile_from_request():
    app = _build_app()
    client = app.test_client()

    response = client.get(
        "/api/echo?conversation_id=conv-query-1",
        headers={
            PROFILE_HEADER: "profile-alpha",
            CLIENT_REQUEST_HEADER: "client-req-123",
        },
    )

    payload = response.get_json()
    assert payload["conversation_id"] == "conv-query-1"
    assert payload["profile_id"] == "profile-alpha"
    assert payload["client_request_id"] == "client-req-123"


def test_extracts_conversation_id_from_json_body():
    app = _build_app()
    client = app.test_client()

    response = client.post(
        "/api/echo",
        json={"conversation_id": "conv-body-1"},
    )

    payload = response.get_json()
    assert payload["conversation_id"] == "conv-body-1"


def test_skips_json_body_parse_when_content_length_too_large():
    app = _build_app()
    client = app.test_client()
    huge_id = "x" * 400_000

    response = client.post(
        "/api/echo",
        json={"conversation_id": huge_id},
    )

    payload = response.get_json()
    assert payload["conversation_id"] == "-"


def test_logger_format_fields_work_without_request_context():
    logger_name = f"request-context-test-{uuid.uuid4().hex}"
    logger = setup_logger(
        logger_name,
        level="INFO",
        format_string=(
            "%(request_id)s %(conversation_id)s %(profile_id)s "
            "%(client_request_id)s %(message)s"
        ),
    )

    assert isinstance(logger, logging.Logger)
    logger.info("outside request context should not fail")
