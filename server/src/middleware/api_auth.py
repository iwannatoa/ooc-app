"""
Bearer token API authentication.

When FLASK_API_TOKEN is set, requests under /api must send Authorization: Bearer <token>,
except paths listed in API_AUTH_EXEMPT_PATHS.

Use hmac.compare_digest for constant-time comparison. Tokens in env are not high-assurance
secrets if also embedded in a web bundle; combine with bind to 127.0.0.1 in production.
"""
from __future__ import annotations

import hmac
from typing import TYPE_CHECKING, Any, Optional, Tuple

from flask import jsonify

if TYPE_CHECKING:
    from flask import Flask


def register_api_auth(app: Flask) -> None:
    """Register before_request handler using app.config (populated from Config)."""

    @app.before_request
    def _require_bearer_if_configured() -> Optional[Tuple[Any, int]]:
        from flask import request

        token = app.config.get('FLASK_API_TOKEN')
        if not token:
            return None

        path = request.path or ''
        exempt = app.config.get('API_AUTH_EXEMPT_PATHS') or frozenset()
        if path in exempt:
            return None

        # Allow CORS preflight requests to pass without bearer token.
        if request.method == 'OPTIONS':
            return None

        if not path.startswith('/api'):
            return None

        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401
        presented = auth[7:].strip().encode('utf-8')
        expected = str(token).encode('utf-8')
        if not hmac.compare_digest(presented, expected):
            return jsonify({'success': False, 'error': 'Forbidden'}), 403
        return None
