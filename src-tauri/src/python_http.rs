use reqwest::RequestBuilder;
use std::time::Duration;

/// Forward `FLASK_API_TOKEN` from the Tauri process so the Flask child matches the desktop client's Bearer.
pub(crate) fn flask_api_token_from_env() -> Option<String> {
    std::env::var("FLASK_API_TOKEN")
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

/// Forward current Flask instance ownership ID for health/stop ownership checks.
pub(crate) fn flask_instance_id_from_env() -> Option<String> {
    std::env::var("FLASK_INSTANCE_ID")
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

/// Parse `netstat -ano` stdout for a LISTENING line containing `:{port}` (Windows heuristics).
fn parse_pid_from_netstat_output(output: &str, port: u16) -> Option<u32> {
    let port_str = format!(":{}", port);
    for line in output.lines() {
        if line.contains(&port_str) && line.contains("LISTENING") {
            // Extract PID (last number in the line)
            if let Some(pid_part) = line.split_whitespace().last() {
                if let Ok(pid) = pid_part.parse::<u32>() {
                    return Some(pid);
                }
            }
        }
    }
    None
}

/// Best-effort PID for a listening TCP port (Windows).
#[cfg(target_os = "windows")]
pub(crate) fn find_pid_by_port(port: u16) -> Option<u32> {
    use std::process::Command;

    // Use netstat to find process using the port
    // netstat -ano | findstr :PORT
    let output = Command::new("netstat").args(&["-ano"]).output().ok()?;
    let output_str = String::from_utf8_lossy(&output.stdout);
    parse_pid_from_netstat_output(&output_str, port)
}

pub(crate) fn add_flask_auth_header(req: RequestBuilder) -> RequestBuilder {
    if let Some(ref t) = flask_api_token_from_env() {
        req.header("Authorization", format!("Bearer {}", t))
    } else {
        req
    }
}

pub(crate) fn add_flask_instance_header(req: RequestBuilder) -> RequestBuilder {
    if let Some(ref instance_id) = flask_instance_id_from_env() {
        req.header("X-Flask-Instance-Id", instance_id)
    } else {
        req
    }
}

pub(crate) fn add_flask_security_headers(req: RequestBuilder) -> RequestBuilder {
    add_flask_instance_header(add_flask_auth_header(req))
}

/// Returns true only when `/api/health` returns a success status.
pub(crate) async fn flask_health_reachable(port: u16) -> bool {
    let client = reqwest::Client::new();
    let url = format!("http://127.0.0.1:{}/api/health", port);
    let req = add_flask_security_headers(client.get(&url).timeout(Duration::from_secs(2)));
    match req.send().await {
        Ok(response) => response.status().is_success(),
        Err(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    /// `FLASK_API_TOKEN` is process-global; serialize tests that touch the environment.
    static ENV_LOCK: Mutex<()> = Mutex::new(());

    #[test]
    fn parse_netstat_finds_pid_on_listening_line() {
        let sample =
            "  TCP    0.0.0.0:5000           0.0.0.0:0              LISTENING       12345\n";
        assert_eq!(parse_pid_from_netstat_output(sample, 5000), Some(12345));
    }

    #[test]
    fn parse_netstat_returns_none_when_no_match() {
        let sample = "  TCP    127.0.0.1:4999         127.0.0.1:4999         ESTABLISHED     999\n";
        assert_eq!(parse_pid_from_netstat_output(sample, 5000), None);
    }

    #[test]
    fn flask_api_token_trims_and_skips_empty() {
        let _g = ENV_LOCK.lock().unwrap();
        std::env::remove_var("FLASK_API_TOKEN");
        assert_eq!(flask_api_token_from_env(), None);

        std::env::set_var("FLASK_API_TOKEN", "  abc  ");
        assert_eq!(flask_api_token_from_env(), Some("abc".to_string()));

        std::env::set_var("FLASK_API_TOKEN", "   ");
        assert_eq!(flask_api_token_from_env(), None);

        std::env::remove_var("FLASK_API_TOKEN");
    }

    #[test]
    fn add_flask_auth_header_sets_bearer_when_token_present() {
        let _g = ENV_LOCK.lock().unwrap();
        std::env::set_var("FLASK_API_TOKEN", "secret");
        let client = reqwest::Client::new();
        let req = add_flask_auth_header(client.get("http://127.0.0.1:9/"))
            .build()
            .unwrap();
        let auth = req
            .headers()
            .get("Authorization")
            .unwrap()
            .to_str()
            .unwrap();
        assert_eq!(auth, "Bearer secret");
        std::env::remove_var("FLASK_API_TOKEN");
    }

    #[test]
    fn add_flask_auth_header_omits_when_no_token() {
        let _g = ENV_LOCK.lock().unwrap();
        std::env::remove_var("FLASK_API_TOKEN");
        let client = reqwest::Client::new();
        let req = add_flask_auth_header(client.get("http://127.0.0.1:9/"))
            .build()
            .unwrap();
        assert!(req.headers().get("Authorization").is_none());
    }

    #[test]
    fn add_flask_instance_header_sets_instance_id_when_present() {
        let _g = ENV_LOCK.lock().unwrap();
        std::env::set_var("FLASK_INSTANCE_ID", "instance-123");
        let client = reqwest::Client::new();
        let req = add_flask_instance_header(client.get("http://127.0.0.1:9/"))
            .build()
            .unwrap();
        let instance = req
            .headers()
            .get("X-Flask-Instance-Id")
            .unwrap()
            .to_str()
            .unwrap();
        assert_eq!(instance, "instance-123");
        std::env::remove_var("FLASK_INSTANCE_ID");
    }

    #[test]
    fn add_flask_security_headers_sets_both_headers() {
        let _g = ENV_LOCK.lock().unwrap();
        std::env::set_var("FLASK_API_TOKEN", "secret");
        std::env::set_var("FLASK_INSTANCE_ID", "instance-123");
        let client = reqwest::Client::new();
        let req = add_flask_security_headers(client.get("http://127.0.0.1:9/"))
            .build()
            .unwrap();
        assert_eq!(
            req.headers().get("Authorization").unwrap().to_str().unwrap(),
            "Bearer secret"
        );
        assert_eq!(
            req.headers()
                .get("X-Flask-Instance-Id")
                .unwrap()
                .to_str()
                .unwrap(),
            "instance-123"
        );
        std::env::remove_var("FLASK_API_TOKEN");
        std::env::remove_var("FLASK_INSTANCE_ID");
    }
}
