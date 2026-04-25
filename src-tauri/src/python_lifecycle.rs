use std::sync::Arc;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_shell::process::CommandChild;

#[cfg(not(target_os = "windows"))]
use tauri_plugin_shell::{process::CommandEvent, ShellExt};

use tokio::sync::Mutex as TokioMutex;

use crate::api::ApiResponse;
use crate::python_http::{
    add_flask_auth_header, flask_api_token_from_env, flask_health_reachable,
};
#[cfg(target_os = "windows")]
use crate::python_http::find_pid_by_port;
use crate::python_server::PythonServer;

struct StopSnapshot {
    port: Option<u16>,
    pid: Option<u32>,
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
    _app_handle: &AppHandle,
    server_state: &TokioMutex<PythonServer>,
) -> Result<(), String> {
    println!("[FLASK_STOP] Starting Flask server stop procedure");

    #[allow(unused_mut)]
    let mut snap = {
        let mut server = server_state.lock().await;
        StopSnapshot {
            port: server.port.take(),
            pid: server.pid.take(),
            unix_child: server.process.take(),
            #[cfg(target_os = "windows")]
            windows_child: server.windows_child.take(),
        }
    };

    if let Some(port_val) = snap.port {
        println!("[FLASK_STOP] Current Flask port: {}", port_val);
        let client = reqwest::Client::new();
        let shutdown_url = format!("http://127.0.0.1:{}/api/stop", port_val);
        println!("[FLASK_STOP] Attempting graceful shutdown via API...");
        let stop_req = add_flask_auth_header(
            client
                .post(&shutdown_url)
                .timeout(Duration::from_secs(10)),
        );
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
                println!(
                    "[FLASK_STOP] API call failed (server may be down): {}",
                    e
                );
            }
        }

        let deadline = tokio::time::Instant::now() + Duration::from_secs(15);
        while tokio::time::Instant::now() < deadline {
            if !flask_health_reachable(port_val).await {
                break;
            }
            tokio::time::sleep(Duration::from_millis(200)).await;
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
                let pid = snap
                    .pid
                    .or_else(|| find_pid_by_port(port_val))
                    .unwrap_or(0);
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

    println!("[FLASK_STOP] Flask server stop procedure completed");
    Ok(())
}

pub async fn run_start_python_server(
    app_handle: AppHandle,
    server_state: State<'_, TokioMutex<PythonServer>>,
) -> Result<ApiResponse<String>, String> {
    let mut server = server_state.lock().await;

    if server.process.is_some() {
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

            let mut cmd = Command::new("python");
            cmd.args(&[run_script.to_string_lossy().as_ref()]);
            cmd.current_dir(&project_root);
            cmd.env("LOG_LEVEL_DEBUG", "true");
            cmd.env("FLASK_ENV", "development");
            if let Some(path) = &db_path {
                cmd.env("DB_PATH", path);
            }
            if let Some(ref t) = flask_api_token_from_env() {
                cmd.env("FLASK_API_TOKEN", t);
            }
            cmd.stdout(std::process::Stdio::piped());
            cmd.stderr(std::process::Stdio::piped());
            // Set CREATE_NO_WINDOW flag on Windows
            cmd.creation_flags(CREATE_NO_WINDOW);
            cmd
        } else {
            // For production, find the sidecar executable
            let exe_path = match app_handle.path().resource_dir() {
                Ok(dir) => {
                    // Try to find flask-api executable with platform-specific name
                    let platform_exe = if cfg!(target_arch = "x86_64") {
                        "flask-api-x86_64-pc-windows-msvc.exe"
                    } else {
                        return Ok(ApiResponse {
                            success: false,
                            data: None,
                            error: Some("Unsupported architecture".to_string()),
                        });
                    };
                    let exe = dir.join(platform_exe);
                    if exe.exists() {
                        exe
                    } else {
                        // Fallback to generic name
                        let generic_exe = dir.join("flask-api.exe");
                        if generic_exe.exists() {
                            generic_exe
                        } else {
                            return Ok(ApiResponse {
                                success: false,
                                data: None,
                                error: Some(
                                    "Cannot find embedded Python server executable".to_string(),
                                ),
                            });
                        }
                    }
                }
                Err(e) => {
                    return Ok(ApiResponse {
                        success: false,
                        data: None,
                        error: Some(format!("Failed to get resource directory: {}", e)),
                    });
                }
            };

            let mut cmd = Command::new(&exe_path);
            if let Some(path) = &db_path {
                cmd.env("DB_PATH", path);
            }
            if let Some(ref t) = flask_api_token_from_env() {
                cmd.env("FLASK_API_TOKEN", t);
            }
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
                let trimmed = line.trim();
                if trimmed.contains("FLASK_PORT:") {
                    if let Some(port_part) = trimmed.split("FLASK_PORT:").nth(1) {
                        let port_str = port_part
                            .split_whitespace()
                            .next()
                            .unwrap_or(port_part)
                            .trim();
                        if let Ok(port) = port_str.parse::<u16>() {
                            if let Some(window) = app_handle_clone.get_webview_window("main") {
                                let _ = window.emit("flask-port-ready", port);
                            } else {
                                let _ = app_handle_clone.emit("flask-port-ready", port);
                            }

                            if let Some(server_state) =
                                app_handle_clone.try_state::<TokioMutex<PythonServer>>()
                            {
                                let mut server = server_state.lock().await;
                                server.port = Some(port);
                                server.pid = Some(pid);
                            }
                        }
                    }
                }
                line.clear();
            }
        });

        tokio::spawn(async move {
            let mut reader = BufReader::new(stderr);
            let mut line = String::new();
            while let Ok(n) = reader.read_line(&mut line).await {
                if n == 0 {
                    break;
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

            let mut cmd = app_handle.shell().command("python");
            cmd = cmd.args(&[run_script.to_string_lossy().as_ref()]);
            cmd = cmd.current_dir(&project_root);
            // Enable debug logging in development mode (debug_assertions means dev build)
            cmd = cmd.env("LOG_LEVEL_DEBUG", "true");
            cmd = cmd.env("FLASK_ENV", "development");
            if let Some(path) = &db_path {
                cmd = cmd.env("DB_PATH", path);
            }
            if let Some(ref t) = flask_api_token_from_env() {
                cmd = cmd.env("FLASK_API_TOKEN", t);
            }
            cmd
        } else {
            match app_handle.shell().sidecar("flask-api") {
                Ok(mut cmd) => {
                    if let Some(path) = &db_path {
                        cmd = cmd.env("DB_PATH", path);
                    }
                    if let Some(ref t) = flask_api_token_from_env() {
                        cmd = cmd.env("FLASK_API_TOKEN", t);
                    }
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
                                let trimmed = line_str.trim();
                                if trimmed.contains("FLASK_PORT:") {
                                    if let Some(port_part) = trimmed.split("FLASK_PORT:").nth(1) {
                                        let port_str = port_part
                                            .split_whitespace()
                                            .next()
                                            .unwrap_or(port_part)
                                            .trim();
                                        if let Ok(port) = port_str.parse::<u16>() {
                                            if let Some(window) =
                                                app_handle_clone.get_webview_window("main")
                                            {
                                                window.emit("flask-port-ready", port).is_ok()
                                            } else {
                                                app_handle_clone
                                                    .emit("flask-port-ready", port)
                                                    .is_ok()
                                            };

                                            if let Some(server_state) = app_handle_clone
                                                .try_state::<TokioMutex<PythonServer>>()
                                            {
                                                let mut server = server_state.lock().await;
                                                server.port = Some(port);

                                                // Try to find and store PID by port on Windows
                                                #[cfg(target_os = "windows")]
                                                {
                                                    if let Some(pid) = find_pid_by_port(port) {
                                                        server.pid = Some(pid);
                                                        println!("[FLASK_START] Found and stored Flask process PID: {} for port: {}", pid, port);
                                                    }
                                                }

                                                drop(server);
                                            }

                                            if let Some(window) =
                                                app_handle_clone.get_webview_window("main")
                                            {
                                                let _ = window.emit("flask-port-ready", port);
                                            } else {
                                                let _ =
                                                    app_handle_clone.emit("flask-port-ready", port);
                                            }
                                        }
                                    }
                                }
                            }
                            // Flask will send the further log from here.
                            CommandEvent::Stderr(line) => {
                                let error_msg =
                                    format!("Flask: {}", String::from_utf8_lossy(&line));
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
