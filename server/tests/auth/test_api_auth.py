"""Bearer API auth: exempt paths, /api/stop requires token when configured."""
import pytest
from flask import Flask, jsonify

from config import TestingConfig
from middleware.api_auth import register_api_auth


@pytest.fixture
def auth_app():
    app = Flask(__name__)
    app.config.from_object(TestingConfig)
    app.config['FLASK_API_TOKEN'] = 'secret-test-token'
    app.config['API_AUTH_EXEMPT_PATHS'] = frozenset({'/'})
    register_api_auth(app)

    @app.route('/api/health')
    def health():
        return jsonify({'status': 'ok'})

    @app.route('/api/protected')
    def protected():
        return jsonify({'ok': True})

    @app.route('/api/stop', methods=['POST'])
    def stop():
        return jsonify({'success': True, 'message': 'stop'})

    @app.route('/api/conversations/list', methods=['OPTIONS'])
    def conversations_options():
        return (
            '',
            204,
            {
                'Access-Control-Allow-Origin': 'http://localhost:1420',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Authorization,Content-Type',
            },
        )

    return app


def test_root_not_subject_to_bearer(auth_app):
    @auth_app.route('/')
    def root():
        return jsonify({'name': 'x'})
    client = auth_app.test_client()
    r = client.get('/')
    assert r.status_code == 200


def test_api_health_requires_bearer(auth_app):
    client = auth_app.test_client()
    assert client.get('/api/health').status_code == 401
    r = client.get('/api/health', headers={'Authorization': 'Bearer secret-test-token'})
    assert r.status_code == 200


def test_api_protected_requires_bearer(auth_app):
    client = auth_app.test_client()
    assert client.get('/api/protected').status_code == 401
    assert client.get('/api/protected', headers={'Authorization': 'Bearer wrong'}).status_code == 403
    ok = client.get(
        '/api/protected',
        headers={'Authorization': 'Bearer secret-test-token'},
    )
    assert ok.status_code == 200


def test_api_stop_requires_bearer_same_as_other_api(auth_app):
    client = auth_app.test_client()
    assert client.post('/api/stop').status_code == 401
    r = client.post(
        '/api/stop',
        headers={'Authorization': 'Bearer secret-test-token'},
    )
    assert r.status_code == 200


def test_options_preflight_is_not_blocked_by_bearer(auth_app):
    client = auth_app.test_client()
    r = client.options('/api/conversations/list')
    assert r.status_code == 204
    assert 'Authorization' in (r.headers.get('Access-Control-Allow-Headers') or '')

