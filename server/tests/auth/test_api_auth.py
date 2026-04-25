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
    app.config['API_AUTH_EXEMPT_PATHS'] = frozenset({'/', '/api/health'})
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

    return app


def test_root_not_subject_to_bearer(auth_app):
    @auth_app.route('/')
    def root():
        return jsonify({'name': 'x'})
    client = auth_app.test_client()
    r = client.get('/')
    assert r.status_code == 200


def test_api_health_exempt_without_bearer(auth_app):
    client = auth_app.test_client()
    r = client.get('/api/health')
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

