use reqwest;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_shell::process::CommandChild;

#[cfg(not(target_os = "windows"))]
use tauri_plugin_shell::{process::CommandEvent, ShellExt};

use tokio::sync::Mutex as TokioMutex;

// kill_tree is no longer used since we only use API shutdown
// #[cfg(target_os = "windows")]
// use kill_tree::blocking::kill_tree;

#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

pub struct PythonServer {
    pub process: Option<CommandChild>,
    pub port: Option<u16>,
    pub pid: Option<u32>,
}

impl PythonServer {
    pub fn new() -> Self {
        Self {
            process: None,
            port: None,
            pid: None,
        }
    }
}

#[tauri::command]
pub async fn start_python_server(
    app_handle: AppHandle,
    server_state: State<'_, TokioMutex<PythonServer>>,
) -> Result<ApiResponse<String>, String> {
    let mut server = server_state.lock().await;

    if let Some(_) = server.process {
        let _ = stop_python_server(app_handle.clone(), server_state.clone()).await;
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
        use tokio::process::Command;
        use tokio::io::{AsyncBufReadExt, BufReader};

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

        // Store child handle for later termination
        // We need to keep the child alive, so we'll store it in a way that allows us to kill it later
        // For now, we'll use the PID-based approach in stop_python_server_internal
        let mut child_handle = child;
        tokio::spawn(async move {
            let _ = child_handle.wait().await;
        });

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
            cmd
        } else {
            match app_handle.shell().sidecar("flask-api") {
                Ok(mut cmd) => {
                    if let Some(path) = &db_path {
                        cmd = cmd.env("DB_PATH", path);
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
                                            app_handle_clone.emit("flask-port-ready", port).is_ok()
                                        };

                                        if let Some(server_state) =
                                            app_handle_clone.try_state::<TokioMutex<PythonServer>>()
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
                                            let _ = app_handle_clone.emit("flask-port-ready", port);
                                        }
                                    }
                                }
                            }
                        }
                        // Flask will send the further log from here.
                        CommandEvent::Stderr(line) => {
                            let error_msg = format!("Flask: {}", String::from_utf8_lossy(&line));
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

#[tauri::command]
pub async fn get_flask_port(
    app_handle: AppHandle,
    server_state: State<'_, TokioMutex<PythonServer>>,
) -> Result<ApiResponse<u16>, String> {
    let server = server_state.lock().await;
    if let Some(port) = server.port {
        return Ok(ApiResponse {
            success: true,
            data: Some(port),
            error: None,
        });
    }

    drop(server);
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    let server = server_state.lock().await;
    if let Some(port) = server.port {
        return Ok(ApiResponse {
            success: true,
            data: Some(port),
            error: None,
        });
    }

    drop(server);

    let client = reqwest::Client::new();
    let mut tasks = Vec::new();
    for port in 5000..=5100 {
        let client_clone = client.clone();
        let task = tokio::spawn(async move {
            match client_clone
                .get(format!("http://localhost:{}/api/health", port))
                .timeout(std::time::Duration::from_millis(200))
                .send()
                .await
            {
                Ok(response) => {
                    if response.status().is_success() {
                        return Some(port);
                    }
                }
                Err(_) => {}
            }
            None
        });
        tasks.push(task);
    }

    for task in tasks {
        if let Ok(Some(port)) = task.await {
            if let Some(server_state_ref) = app_handle.try_state::<TokioMutex<PythonServer>>() {
                let mut server = server_state_ref.lock().await;
                server.port = Some(port);
            }

            return Ok(ApiResponse {
                success: true,
                data: Some(port),
                error: None,
            });
        }
    }

    Ok(ApiResponse {
        success: false,
        data: None,
        error: Some("Cannot get port number, server may not be started".to_string()),
    })
}

// Helper function to find PID by port on Windows
// Currently not used since we only use API shutdown, but kept for potential future use
#[cfg(target_os = "windows")]
#[allow(dead_code)]
fn find_pid_by_port(port: u16) -> Option<u32> {
    use std::process::Command;

    // Use netstat to find process using the port
    // netstat -ano | findstr :PORT
    let output = Command::new("netstat").args(&["-ano"]).output().ok()?;

    let output_str = String::from_utf8_lossy(&output.stdout);
    let port_str = format!(":{}", port);

    for line in output_str.lines() {
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

pub async fn stop_python_server_internal(
    _app_handle: &AppHandle,
    server_state: &TokioMutex<PythonServer>,
) -> Result<(), String> {
    println!("[FLASK_STOP] Starting Flask server stop procedure");
    let mut server = server_state.lock().await;

    let port = server.port;
    let _process = server.process.take(); // Take ownership but don't use it unless API fails
    let _stored_pid = server.pid;

    if let Some(port_val) = port {
        println!("[FLASK_STOP] Current Flask port: {}", port_val);

        // Use API to gracefully shutdown the server
        let client = reqwest::Client::new();
        let shutdown_url = format!("http://localhost:{}/api/stop", port_val);

        println!("[FLASK_STOP] Attempting graceful shutdown via API...");
        match client
            .post(&shutdown_url)
            .timeout(std::time::Duration::from_secs(10))
            .send()
            .await
        {
            Ok(response) => {
                if response.status().is_success() {
                    // Try to read the response body to get the message
                    match response.json::<serde_json::Value>().await {
                        Ok(json) => {
                            if let Some(message) = json.get("message").and_then(|m| m.as_str()) {
                                println!("[FLASK_STOP] Server response: {}", message);
                            }
                        }
                        Err(_) => {
                            // Response might not be JSON, that's okay
                        }
                    }
                    println!("[FLASK_STOP] Graceful shutdown API call successful, server has been shut down");
                } else {
                    println!(
                        "[FLASK_STOP] API returned status {}, but continuing shutdown",
                        response.status()
                    );
                }
            }
            Err(e) => {
                // If API call fails, the server might already be down or unreachable
                // This is expected if the server has already shut down
                println!(
                    "[FLASK_STOP] API call failed (server may have already shut down): {}",
                    e
                );
            }
        }
    } else {
        println!("[FLASK_STOP] No port information available, cannot call shutdown API");
    }

    // Clear port, process, and PID state
    server.port = None;
    server.pid = None;
    println!("[FLASK_STOP] Cleared Flask port and PID from server state");

    println!("[FLASK_STOP] Flask server stop procedure completed");
    Ok(())
}

#[tauri::command]
pub async fn stop_python_server(
    app_handle: AppHandle,
    server_state: State<'_, TokioMutex<PythonServer>>,
) -> Result<ApiResponse<String>, String> {
    println!("[FLASK_STOP] stop_python_server command invoked");
    match stop_python_server_internal(&app_handle, &server_state).await {
        Ok(_) => {
            println!("[FLASK_STOP] stop_python_server command completed successfully");
            Ok(ApiResponse {
                success: true,
                data: Some("Python server stopped".to_string()),
                error: None,
            })
        }
        Err(e) => {
            let error_msg = format!("[FLASK_STOP] stop_python_server command failed: {}", e);
            eprintln!("{}", error_msg);
            crate::logger::log_error(&error_msg);
            Ok(ApiResponse {
                success: false,
                data: None,
                error: Some(e),
            })
        }
    }
}

#[tauri::command]
pub async fn get_database_path(app_handle: AppHandle) -> Result<ApiResponse<String>, String> {
    match app_handle.path().app_data_dir() {
        Ok(app_data_dir) => {
            if let Err(e) = std::fs::create_dir_all(&app_data_dir) {
                return Ok(ApiResponse {
                    success: false,
                    data: None,
                    error: Some(format!("Failed to create app data directory: {}", e)),
                });
            }

            let db_path = app_data_dir.join("chat.db");
            let db_path_str = db_path.to_string_lossy().to_string();

            Ok(ApiResponse {
                success: true,
                data: Some(db_path_str),
                error: None,
            })
        }
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            error: Some(format!("Failed to get app data directory: {}", e)),
        }),
    }
}

#[tauri::command]
pub async fn check_python_server_status(
    app_handle: AppHandle,
    server_state: State<'_, TokioMutex<PythonServer>>,
) -> Result<ApiResponse<bool>, String> {
    let server = server_state.lock().await;

    let port = server.port.unwrap_or_else(|| {
        if let Some(port_file) = app_handle
            .path()
            .app_data_dir()
            .ok()
            .map(|dir| dir.join("port.txt"))
        {
            if let Ok(port_str) = std::fs::read_to_string(&port_file) {
                if let Ok(port) = port_str.trim().parse::<u16>() {
                    return port;
                }
            }
        }
        5000 // 默认端口
    });

    let client = reqwest::Client::new();

    match client
        .get(format!("http://localhost:{}/api/health", port))
        .timeout(std::time::Duration::from_secs(3))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                Ok(ApiResponse {
                    success: true,
                    data: Some(true),
                    error: None,
                })
            } else {
                Ok(ApiResponse {
                    success: false,
                    data: Some(false),
                    error: Some("Server response error".to_string()),
                })
            }
        }
        Err(_) => Ok(ApiResponse {
            success: false,
            data: Some(false),
            error: Some("Cannot connect to server".to_string()),
        }),
    }
}
