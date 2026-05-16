import os
import subprocess
import sys
from pathlib import Path


def _import_app_with_env(env_overrides: dict[str, str]) -> subprocess.CompletedProcess[str]:
    repo_root = Path(__file__).resolve().parents[2]
    src_dir = repo_root / "src"
    command = [
        sys.executable,
        "-c",
        (
            "import sys;"
            f"sys.path.insert(0, r'{src_dir.as_posix()}');"
            "import app"
        ),
    ]
    env = os.environ.copy()
    env.update(env_overrides)
    return subprocess.run(
        command,
        cwd=repo_root,
        env=env,
        capture_output=True,
        text=True,
        timeout=30,
    )


def _run_app_snippet(env_overrides: dict[str, str], snippet: str) -> subprocess.CompletedProcess[str]:
    repo_root = Path(__file__).resolve().parents[2]
    src_dir = repo_root / "src"
    command = [
        sys.executable,
        "-c",
        (
            "import sys;"
            f"sys.path.insert(0, r'{src_dir.as_posix()}');"
            "import app as app_module;"
            f"{snippet}"
        ),
    ]
    env = os.environ.copy()
    env.update(env_overrides)
    return subprocess.run(
        command,
        cwd=repo_root,
        env=env,
        capture_output=True,
        text=True,
        timeout=30,
    )


def test_production_bootstrap_requires_flask_api_token() -> None:
    result = _import_app_with_env(
        {
            "FLASK_ENV": "production",
            "FLASK_API_TOKEN": "",
        }
    )
    assert result.returncode != 0
    assert "FLASK_API_TOKEN" in (result.stderr + result.stdout)


def test_development_bootstrap_allows_missing_flask_api_token() -> None:
    result = _import_app_with_env(
        {
            "FLASK_ENV": "development",
            "FLASK_API_TOKEN": "",
        }
    )
    assert result.returncode == 0


def test_development_bootstrap_generates_flask_api_token_when_missing() -> None:
    result = _run_app_snippet(
        {
            "FLASK_ENV": "development",
            "FLASK_API_TOKEN": "",
            "FLASK_INSTANCE_ID": "",
        },
        "import os; print(bool(os.getenv('FLASK_API_TOKEN')))",
    )
    assert result.returncode == 0
    assert "True" in result.stdout


def test_health_endpoint_requires_bearer_when_token_enabled() -> None:
    result = _run_app_snippet(
        {
            "FLASK_ENV": "testing",
            "FLASK_API_TOKEN": "unit-token",
            "FLASK_INSTANCE_ID": "instance-test",
        },
        "client = app_module.app.test_client(); "
        "resp = client.get('/api/health'); "
        "print(resp.status_code)",
    )
    assert result.returncode == 0
    assert "401" in result.stdout


def test_stop_endpoint_rejects_mismatched_instance_id() -> None:
    result = _run_app_snippet(
        {
            "FLASK_ENV": "testing",
            "FLASK_API_TOKEN": "unit-token",
            "FLASK_INSTANCE_ID": "instance-test",
        },
        "client = app_module.app.test_client(); "
        "resp = client.post('/api/stop', headers={"
        "'Authorization': 'Bearer unit-token', "
        "'X-Flask-Instance-Id': 'instance-other'"
        "}); "
        "print(resp.status_code)",
    )
    assert result.returncode == 0
    assert "409" in result.stdout


def test_stop_endpoint_returns_503_when_server_instance_missing() -> None:
    result = _run_app_snippet(
        {
            "FLASK_ENV": "testing",
            "FLASK_API_TOKEN": "unit-token",
            "FLASK_INSTANCE_ID": "instance-test",
        },
        "client = app_module.app.test_client(); "
        "resp = client.post('/api/stop', headers={"
        "'Authorization': 'Bearer unit-token', "
        "'X-Flask-Instance-Id': 'instance-test'"
        "}); "
        "print(resp.status_code)",
    )
    assert result.returncode == 0
    assert "503" in result.stdout


def test_stop_endpoint_accepts_matching_instance_id_when_server_instance_exists() -> None:
    result = _run_app_snippet(
        {
            "FLASK_ENV": "testing",
            "FLASK_API_TOKEN": "unit-token",
            "FLASK_INSTANCE_ID": "instance-test",
        },
        "app_module._server_instance = type("
        "'_StubServer', (), {'shutdown': lambda self: None}"
        ")(); "
        "client = app_module.app.test_client(); "
        "resp = client.post('/api/stop', headers={"
        "'Authorization': 'Bearer unit-token', "
        "'X-Flask-Instance-Id': 'instance-test'"
        "}); "
        "print(resp.status_code); "
        "print(resp.get_json().get('success'))",
    )
    assert result.returncode == 0
    assert "200" in result.stdout
    assert "True" in result.stdout
