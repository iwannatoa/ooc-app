use std::sync::Arc;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_shell::process::CommandChild;

#[cfg(not(target_os = "windows"))]
use tauri_plugin_shell::{process::CommandEvent, ShellExt};

use tokio::sync::Mutex as TokioMutex;

use crate::api::ApiResponse;
#[cfg(target_os = "windows")]
use crate::python_http::find_pid_by_port;
use crate::python_http::{add_flask_security_headers, flask_api_token_from_env, flask_health_reachable};
use crate::python_server::PythonServer;

#[cfg(not(target_os = "windows"))]
fn is_command_available(command: &str) -> bool {
    std::process::Command::new(command)
        .arg("--version")
        .output()
        .is_ok()
}

fn resolve_python_executable_with<F>(
    python_bin_env: Option<&str>,
    is_windows: bool,
    mut command_available: F,
) -> String
where
    F: FnMut(&str) -> bool,
{
    if let Some(python_bin) = python_bin_env {
        let candidate = python_bin.trim();
        if !candidate.is_empty() {
            return candidate.to_string();
        }
    }
    if is_windows {
        "python".to_string()
    } else if command_available("python3") {
        "python3".to_string()
    } else {
        "python".to_string()
    }
}

fn resolve_python_executable() -> String {
    let python_bin = std::env::var("PYTHON_BIN").ok();
    resolve_python_executable_with(
        python_bin.as_deref(),
        cfg!(target_os = "windows"),
        |command| {
            #[cfg(target_os = "windows")]
            {
                let _ = command;
                false
            }
            #[cfg(not(target_os = "windows"))]
            {
                is_command_available(command)
            }
        },
    )
}

fn persist_port_file(app_handle: &AppHandle, port: u16) {
    if let Ok(app_data_dir) = app_handle.path().app_data_dir() {
        let _ = std::fs::create_dir_all(&app_data_dir);
        let _ = std::fs::write(app_data_dir.join("port.txt"), port.to_string());
    }
}

fn clear_port_file(app_handle: &AppHandle) {
    if let Ok(app_data_dir) = app_handle.path().app_data_dir() {
        let _ = std::fs::remove_file(app_data_dir.join("port.txt"));
    }
}

fn generate_runtime_id(prefix: &str) -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or_default();
    let pid = std::process::id();
    format!("{prefix}-{pid:x}-{now:x}")
}

fn ensure_flask_api_token() -> String {
    if let Some(existing) = flask_api_token_from_env() {
        existing
    } else {
        let token = generate_runtime_id("local-token");
        std::env::set_var("FLASK_API_TOKEN", &token);
        token
    }
}

fn ensure_flask_instance_id() -> String {
    if let Ok(existing) = std::env::var("FLASK_INSTANCE_ID") {
        let trimmed = existing.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }
    let instance_id = generate_runtime_id("instance");
    std::env::set_var("FLASK_INSTANCE_ID", &instance_id);
    instance_id
}

fn clear_flask_runtime_vars() {
    std::env::remove_var("FLASK_API_TOKEN");
    std::env::remove_var("FLASK_INSTANCE_ID");
}

fn parse_flask_port_from_line(line: &str) -> Option<u16> {
    let trimmed = line.trim();

    if let Some(port_part) = trimmed.split("FLASK_PORT:").nth(1) {
        let port_str = port_part
            .split_whitespace()
            .next()
            .unwrap_or(port_part)
            .trim();
        if let Ok(port) = port_str.parse::<u16>() {
            return Some(port);
        }
    }

    if let Some(port_part) = trimmed.split("Port:").nth(1) {
        let digits: String = port_part
            .trim()
            .chars()
            .take_while(|ch| ch.is_ascii_digit())
            .collect();
        if !digits.is_empty() {
            if let Ok(port) = digits.parse::<u16>() {
                return Some(port);
            }
        }
    }

    None
}

async fn apply_discovered_flask_port(app_handle: &AppHandle, port: u16, pid: Option<u32>) {
    persist_port_file(app_handle, port);
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.emit("flask-port-ready", port);
    } else {
        let _ = app_handle.emit("flask-port-ready", port);
    }

    if let Some(server_state) = app_handle.try_state::<TokioMutex<PythonServer>>() {
        let mut server = server_state.lock().await;
        server.port = Some(port);
        if let Some(process_id) = pid {
            server.pid = Some(process_id);
        }
    }
}

#[cfg(target_os = "windows")]
fn resolve_windows_sidecar_path(app_handle: &AppHandle) -> Result<std::path::PathBuf, String> {
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource directory: {}", e))?;

    let arch = std::env::consts::ARCH;
    let arch_key = match arch {
        "x86_64" => "x86_64",
        "aarch64" => "aarch64",
        "x86" | "i686" => "i686",
        _ => arch,
    };

    let candidates = [
        format!("flask-api-{}-pc-windows-msvc.exe", arch_key),
        "flask-api.exe".to_string(),
    ];

    for name in candidates {
        let path = resource_dir.join(&name);
        if path.exists() {
            return Ok(path);
        }
    }

    for entry in std::fs::read_dir(&resource_dir)
        .map_err(|e| format!("Failed to read resource directory: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read sidecar entry: {}", e))?;
        let path = entry.path();
        let is_flask_sidecar = path
            .file_name()
            .and_then(|s| s.to_str())
            .map(|name| name.starts_with("flask-api") && name.ends_with(".exe"))
            .unwrap_or(false);
        if is_flask_sidecar {
            return Ok(path);
        }
    }

    Err("Cannot find embedded Python server executable".to_string())
}

struct StopSnapshot {
    port: Option<u16>,
    pid: Option<u32>,
    instance_id: Option<String>,
    /// Populated on non-Windows (shell `CommandChild`); unused on Windows builds.
    #[cfg_attr(target_os = "windows", allow(dead_code))]
    unix_child: Option<CommandChild>,
    #[cfg(target_os = "windows")]
    windows_child: Option<Arc<TokioMutex<Option<tokio::process::Child>>>>,
}

#[cfg(target_os = "windows")]
async fn wait_or_kill_tokio_child(
    arc: &Arc<TokioMutex<Option<tokio::process::Child>>>,
    wait_secs: u64,
) {
    let wait_fut = async {
        let mut g = arc.lock().await;
        if let Some(ref mut c) = *g {
            let _ = c.wait().await;
        }
    };
    if tokio::time::timeout(Duration::from_secs(wait_secs), wait_fut)
        .await
        .is_err()
    {
        let mut g = arc.lock().await;
        if let Some(ref mut c) = *g {
            let _ = c.kill().await;
            let _ = c.wait().await;
        }
    }
    let mut g = arc.lock().await;
    *g = None;
}

#[cfg(target_os = "windows")]
fn try_taskkill_pid_tree(pid: u32) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    if pid == 0 {
        return;
    }
    let _ = std::process::Command::new("taskkill")
        .args(["/PID", &pid.to_string(), "/F", "/T"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
}

#[cfg(not(target_os = "windows"))]
fn try_kill_pid_unix(pid: u32) {
    if pid == 0 {
        return;
    }
    let _ = std::process::Command::new("kill")
        .args(["-9", &pid.to_string()])
        .output();
}

pub async fn stop_python_server_internal(
    app_handle: &AppHandle,
    server_state: &TokioMutex<PythonServer>,
) -> Result<(), String> {
    println!("[FLASK_STOP] Starting Flask server stop procedure");

    #[allow(unused_mut)]
    let mut snap = {
        let mut server = server_state.lock().await;
        StopSnapshot {
            port: server.port.take(),
            pid: server.pid.take(),
            instance_id: server.instance_id.take(),
            unix_child: server.process.take(),
            #[cfg(target_os = "windows")]
            windows_child: server.windows_child.take(),
        }
    };

    if let Some(port_val) = snap.port {
        println!("[FLASK_STOP] Current Flask port: {}", port_val);
        if let Some(ref instance_id) = snap.instance_id {
            std::env::set_var("FLASK_INSTANCE_ID", instance_id);
        }
        let client = reqwest::Client::new();
        let shutdown_url = format!("http://127.0.0.1:{}/api/stop", port_val);
        println!("[FLASK_STOP] Attempting graceful shutdown via API...");
        let stop_req =
            add_flask_security_headers(client.post(&shutdown_url).timeout(Duration::from_secs(10)));
        match stop_req.send().await {
            Ok(response) => {
                if response.status().is_success() {
                    match response.json::<serde_json::Value>().await {
                        Ok(json) => {
                            if let Some(message) = json.get("message").and_then(|m| m.as_str()) {
                                println!("[FLASK_STOP] Server response: {}", message);
                            }
                        }
                        Err(_) => {}
                    }
                    println!("[FLASK_STOP] Graceful shutdown API returned success");
                } else {
                    println!(
                        "[FLASK_STOP] API returned status {}, continuing with wait/kill",
                        response.status()
                    );
                }
            }
            Err(e) => {
                println!("[FLASK_STOP] API call failed (server may be down): {}", e);
            }
        }

        let deadline = tokio::time::Instant::now() + Duration::from_secs(15);
        let mut became_unreachable = false;
        while tokio::time::Instant::now() < deadline {
            if !flask_health_reachable(port_val).await {
                became_unreachable = true;
                break;
            }
            tokio::time::sleep(Duration::from_millis(200)).await;
        }
        if became_unreachable {
            println!("[FLASK_STOP] Health probe became unreachable; backend likely exited");
        } else {
            println!("[FLASK_STOP] Health still reachable after grace wait; may need force kill");
        }
    } else {
        println!("[FLASK_STOP] No port; skipping HTTP shutdown (state may already be cleared)");
    }

    #[cfg(target_os = "windows")]
    if let Some(ref arc) = snap.windows_child {
        println!("[FLASK_STOP] Waiting for Windows child process (or force kill)...");
        wait_or_kill_tokio_child(arc, 12).await;
    }

    if let Some(port_val) = snap.port {
        if flask_health_reachable(port_val).await {
            println!("[FLASK_STOP] Server still reachable after grace period; forcing kill");
            #[cfg(target_os = "windows")]
            {
                let pid = snap.pid.or_else(|| find_pid_by_port(port_val)).unwrap_or(0);
                try_taskkill_pid_tree(pid);
            }
            #[cfg(not(target_os = "windows"))]
            {
                if let Some(c) = snap.unix_child.take() {
                    let _ = c.kill();
                } else if let Some(pid) = snap.pid {
                    try_kill_pid_unix(pid);
                }
            }
        }
    }

    clear_port_file(app_handle);
    clear_flask_runtime_vars();
    println!("[FLASK_STOP] Flask server stop procedure completed");
    Ok(())
}

pub async fn run_start_python_server(
    app_handle: AppHandle,
    server_state: State<'_, TokioMutex<PythonServer>>,
) -> Result<ApiResponse<String>, String> {
    let server = server_state.lock().await;

    #[allow(unused_mut)]
    let mut already_running = server.process.is_some() || server.port.is_some();
    #[cfg(target_os = "windows")]
    {
        if server.windows_child.is_some() {
            already_running = true;
        }
    }

    drop(server);

    if already_running {
        // If current process is healthy, keep it to avoid stop/start thrash.
        if let Some(state_ref) = app_handle.try_state::<TokioMutex<PythonServer>>() {
            let server = state_ref.lock().await;
            if let Some(port) = server.port {
                if flask_health_reachable(port).await {
                    return Ok(ApiResponse {
                        success: true,
                        data: Some("Python Flask server already running".to_string()),
                        error: None,
                    });
                }
            }
        }

        println!("[FLASK_STOP] stop_python_server command invoked");
        match stop_python_server_internal(&app_handle, &server_state).await {
            Ok(_) => {
                println!("[FLASK_STOP] stop_python_server command completed successfully");
            }
            Err(e) => {
                let error_msg = format!("[FLASK_STOP] stop_python_server command failed: {}", e);
                eprintln!("{}", error_msg);
                crate::logger::log_error(&error_msg);
            }
        }
    }

    let flask_api_token = ensure_flask_api_token();
    let flask_instance_id = ensure_flask_instance_id();

    let mut server = server_state.lock().await;
    server.port = None;
    server.instance_id = Some(flask_instance_id.clone());

    let db_path = match app_handle.path().app_data_dir() {
        Ok(app_data_dir) => {
            if let Err(e) = std::fs::create_dir_all(&app_data_dir) {
                return Ok(ApiResponse {
                    success: false,
                    data: None,
                    error: Some(format!("Failed to create app data directory: {}", e)),
                });
            }
            let db_path = app_data_dir.join("chat.db");
            Some(db_path.to_string_lossy().to_string())
        }
        Err(_) => None,
    };

    // Use native tokio::process::Command on Windows to hide console window
    // Tauri shell plugin doesn't support CREATE_NO_WINDOW flag
    #[cfg(target_os = "windows")]
    {
        use tokio::io::{AsyncBufReadExt, BufReader};
        use tokio::process::Command;

        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let python_bin = resolve_python_executable();

        let mut native_cmd = if cfg!(debug_assertions) {
            let project_root = std::env::current_dir()
                .ok()
                .and_then(|dir| {
                    if dir
                        .file_name()
                        .and_then(|name| name.to_str())
                        .map(|name| name == "src-tauri")
                        .unwrap_or(false)
                    {
                        dir.parent().map(|p| p.to_path_buf())
                    } else {
                        std::env::current_exe()
                            .ok()
                            .and_then(|exe| {
                                exe.parent()
                                    .and_then(|p| p.parent())
                                    .and_then(|p| p.parent())
                                    .and_then(|p| p.parent())
                                    .and_then(|p| p.parent())
                                    .map(|p| p.to_path_buf())
                            })
                            .or(Some(dir))
                    }
                })
                .unwrap_or_else(|| std::path::PathBuf::from("."));

            let run_script = project_root.join("server").join("run.py");

            let mut cmd = Command::new(&python_bin);
            cmd.args(&[run_script.to_string_lossy().as_ref()]);
            cmd.current_dir(&project_root);
            cmd.env("LOG_LEVEL_DEBUG", "true");
            cmd.env("FLASK_ENV", "development");
            if let Some(path) = &db_path {
                cmd.env("DB_PATH", path);
            }
            cmd.env("FLASK_API_TOKEN", &flask_api_token);
            cmd.env("FLASK_INSTANCE_ID", &flask_instance_id);
            cmd.env("TAURI_PARENT_PID", std::process::id().to_string());
            cmd.stdout(std::process::Stdio::piped());
            cmd.stderr(std::process::Stdio::piped());
            // Set CREATE_NO_WINDOW flag on Windows
            cmd.creation_flags(CREATE_NO_WINDOW);
            cmd
        } else {
            let exe_path = match resolve_windows_sidecar_path(&app_handle) {
                Ok(path) => path,
                Err(error) => {
                    return Ok(ApiResponse {
                        success: false,
                        data: None,
                        error: Some(error),
                    });
                }
            };

            let mut cmd = Command::new(&exe_path);
            if let Some(path) = &db_path {
                cmd.env("DB_PATH", path);
            }
            cmd.env("FLASK_API_TOKEN", &flask_api_token);
            cmd.env("FLASK_INSTANCE_ID", &flask_instance_id);
            cmd.env("TAURI_PARENT_PID", std::process::id().to_string());
            cmd.stdout(std::process::Stdio::piped());
            cmd.stderr(std::process::Stdio::piped());
            // Set CREATE_NO_WINDOW flag on Windows
            cmd.creation_flags(CREATE_NO_WINDOW);
            cmd
        };

        let mut child = match native_cmd.spawn() {
            Ok(child) => child,
            Err(e) => {
                return Ok(ApiResponse {
                    success: false,
                    data: None,
                    error: Some(format!("Failed to start Python server: {}", e)),
                });
            }
        };

        let pid = child.id().unwrap_or(0);
        let stdout = match child.stdout.take() {
            Some(stdout) => stdout,
            None => {
                return Ok(ApiResponse {
                    success: false,
                    data: None,
                    error: Some("Failed to get stdout".to_string()),
                });
            }
        };
        let stderr = match child.stderr.take() {
            Some(stderr) => stderr,
            None => {
                return Ok(ApiResponse {
                    success: false,
                    data: None,
                    error: Some("Failed to get stderr".to_string()),
                });
            }
        };

        // Store PID
        server.pid = Some(pid);

        // Spawn tasks to read stdout and stderr
        let app_handle_clone = app_handle.clone();
        tokio::spawn(async move {
            let mut reader = BufReader::new(stdout);
            let mut line = String::new();
            while let Ok(n) = reader.read_line(&mut line).await {
                if n == 0 {
                    break;
                }
                if let Some(port) = parse_flask_port_from_line(&line) {
                    apply_discovered_flask_port(&app_handle_clone, port, Some(pid)).await;
                }
                line.clear();
            }
        });

        let app_handle_clone_err = app_handle.clone();
        tokio::spawn(async move {
            let mut reader = BufReader::new(stderr);
            let mut line = String::new();
            while let Ok(n) = reader.read_line(&mut line).await {
                if n == 0 {
                    break;
                }
                if let Some(port) = parse_flask_port_from_line(&line) {
                    apply_discovered_flask_port(&app_handle_clone_err, port, Some(pid)).await;
                }
                let error_msg = format!("Flask: {}", line.trim());
                eprintln!("{}", error_msg);
                crate::logger::log_error(&error_msg);
                line.clear();
            }
        });

        let child_arc = Arc::new(TokioMutex::new(Some(child)));
        server.windows_child = Some(child_arc);

        return Ok(ApiResponse {
            success: true,
            data: Some("Python Flask server started successfully".to_string()),
            error: None,
        });
    }

    // For non-Windows platforms, use Tauri shell plugin as before
    #[cfg(not(target_os = "windows"))]
    {
        let python_bin = resolve_python_executable();
        let command = if cfg!(debug_assertions) {
            let project_root = std::env::current_dir()
                .ok()
                .and_then(|dir| {
                    if dir
                        .file_name()
                        .and_then(|name| name.to_str())
                        .map(|name| name == "src-tauri")
                        .unwrap_or(false)
                    {
                        dir.parent().map(|p| p.to_path_buf())
                    } else {
                        std::env::current_exe()
                            .ok()
                            .and_then(|exe| {
                                exe.parent()
                                    .and_then(|p| p.parent())
                                    .and_then(|p| p.parent())
                                    .and_then(|p| p.parent())
                                    .and_then(|p| p.parent())
                                    .map(|p| p.to_path_buf())
                            })
                            .or(Some(dir))
                    }
                })
                .unwrap_or_else(|| std::path::PathBuf::from("."));

            let run_script = project_root.join("server").join("run.py");

            let mut cmd = app_handle.shell().command(&python_bin);
            cmd = cmd.args(&[run_script.to_string_lossy().as_ref()]);
            cmd = cmd.current_dir(&project_root);
            // Enable debug logging in development mode (debug_assertions means dev build)
            cmd = cmd.env("LOG_LEVEL_DEBUG", "true");
            cmd = cmd.env("FLASK_ENV", "development");
            if let Some(path) = &db_path {
                cmd = cmd.env("DB_PATH", path);
            }
            cmd = cmd.env("FLASK_API_TOKEN", &flask_api_token);
            cmd = cmd.env("FLASK_INSTANCE_ID", &flask_instance_id);
            cmd = cmd.env("TAURI_PARENT_PID", std::process::id().to_string());
            cmd
        } else {
            match app_handle.shell().sidecar("flask-api") {
                Ok(mut cmd) => {
                    if let Some(path) = &db_path {
                        cmd = cmd.env("DB_PATH", path);
                    }
                    cmd = cmd.env("FLASK_API_TOKEN", &flask_api_token);
                    cmd = cmd.env("FLASK_INSTANCE_ID", &flask_instance_id);
                    cmd = cmd.env("TAURI_PARENT_PID", std::process::id().to_string());
                    cmd
                }
                Err(e) => {
                    return Ok(ApiResponse {
                        success: false,
                        data: None,
                        error: Some(format!(
                            "Cannot find embedded Python server executable: {}",
                            e
                        )),
                    });
                }
            }
        };

        match command.spawn() {
            Ok((mut rx, child)) => {
                server.process = Some(child);

                let app_handle_clone = app_handle.clone();

                tauri::async_runtime::spawn(async move {
                    while let Some(event) = rx.recv().await {
                        match event {
                            CommandEvent::Stdout(line) => {
                                let line_str = String::from_utf8_lossy(&line);
                                if let Some(port) = parse_flask_port_from_line(&line_str) {
                                    apply_discovered_flask_port(&app_handle_clone, port, None).await;
                                }
                            }
                            // Flask will send the further log from here.
                            CommandEvent::Stderr(line) => {
                                let line_str = String::from_utf8_lossy(&line);
                                if let Some(port) = parse_flask_port_from_line(&line_str) {
                                    apply_discovered_flask_port(&app_handle_clone, port, None).await;
                                }
                                let error_msg =
                                    format!("Flask: {}", line_str);
                                eprintln!("{}", error_msg);
                                crate::logger::log_error(&error_msg);
                            }
                            CommandEvent::Terminated(_) => {
                                break;
                            }
                            _ => {}
                        }
                    }
                });

                Ok(ApiResponse {
                    success: true,
                    data: Some("Python Flask server started successfully".to_string()),
                    error: None,
                })
            }
            Err(e) => Ok(ApiResponse {
                success: false,
                data: None,
                error: Some(format!("Failed to start Python server: {}", e)),
            }),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_python_executable_prefers_python_bin_env() {
        let selected = resolve_python_executable_with(Some("custom-python"), false, |_| false);
        assert_eq!(selected, "custom-python");
    }

    #[test]
    fn resolve_python_executable_uses_python_on_windows() {
        let selected = resolve_python_executable_with(None, true, |_| true);
        assert_eq!(selected, "python");
    }

    #[test]
    fn resolve_python_executable_prefers_python3_on_non_windows() {
        let selected = resolve_python_executable_with(None, false, |command| command == "python3");
        assert_eq!(selected, "python3");
    }

    #[test]
    fn resolve_python_executable_falls_back_to_python_when_python3_missing() {
        let selected = resolve_python_executable_with(None, false, |_| false);
        assert_eq!(selected, "python");
    }
}
