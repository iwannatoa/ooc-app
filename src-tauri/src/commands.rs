use reqwest;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};

use tokio::sync::Mutex as TokioMutex;

#[cfg(target_os = "windows")]
use kill_tree::blocking::kill_tree;

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
        Err(_) => {
            None
        }
    };

    let command = if cfg!(debug_assertions) {
        let project_root = std::env::current_dir()
            .ok()
            .and_then(|dir| {
                if dir.file_name()
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
            .unwrap_or_else(|| {
                std::path::PathBuf::from(".")
            });
        
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
                    error: Some(format!("Cannot find embedded Python server executable: {}", e)),
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
                                    let port_str = port_part.split_whitespace().next().unwrap_or(port_part).trim();
                                    if let Ok(port) = port_str.parse::<u16>() {
                                        if let Some(window) = app_handle_clone.get_webview_window("main") {
                                            window.emit("flask-port-ready", port).is_ok()
                                        } else {
                                            app_handle_clone.emit("flask-port-ready", port).is_ok()
                                        };
                                        
                                        if let Some(server_state) = app_handle_clone.try_state::<TokioMutex<PythonServer>>() {
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
                                        
                                        if let Some(window) = app_handle_clone.get_webview_window("main") {
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
        Err(e) => {
            Ok(ApiResponse {
                success: false,
                data: None,
                error: Some(format!("Failed to start Python server: {}", e)),
            })
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
#[cfg(target_os = "windows")]
fn find_pid_by_port(port: u16) -> Option<u32> {
    use std::process::Command;
    
    // Use netstat to find process using the port
    // netstat -ano | findstr :PORT
    let output = Command::new("netstat")
        .args(&["-ano"])
        .output()
        .ok()?;
    
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
    let process = server.process.take();
    let stored_pid = server.pid;
    
    if let Some(port_val) = port {
        println!("[FLASK_STOP] Current Flask port: {}", port_val);
        
        // First, try to gracefully shutdown via API
        let client = reqwest::Client::new();
        let shutdown_url = format!("http://localhost:{}/api/stop", port_val);
        
        println!("[FLASK_STOP] Attempting graceful shutdown via API...");
        match client
            .post(&shutdown_url)
            .timeout(std::time::Duration::from_secs(2))
            .send()
            .await
        {
            Ok(_) => {
                println!("[FLASK_STOP] Graceful shutdown API call successful");
                // Wait a bit for graceful shutdown
                tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
            }
            Err(e) => {
                println!("[FLASK_STOP] Graceful shutdown API call failed: {}, will use process kill", e);
            }
        }
    }
    
    // Try to kill using stored PID or find PID by port
    let pid_to_kill = stored_pid.or_else(|| {
        #[cfg(target_os = "windows")]
        {
            if let Some(port_val) = port {
                println!("[FLASK_STOP] Attempting to find PID by port: {}", port_val);
                find_pid_by_port(port_val)
            } else {
                None
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            None
        }
    });
    
    // Use kill_tree to terminate process tree on Windows
    #[cfg(target_os = "windows")]
    {
        if let Some(pid) = pid_to_kill {
            println!("[FLASK_STOP] Found PID: {}, using kill_tree to terminate process tree", pid);
            match kill_tree(pid) {
                Ok(outputs) => {
                    for output in outputs {
                        match output {
                            kill_tree::Output::Killed { process_id, name, .. } => {
                                println!("[FLASK_STOP] Killed process {}: {}", process_id, name);
                            }
                            kill_tree::Output::MaybeAlreadyTerminated { process_id, .. } => {
                                println!("[FLASK_STOP] Process {} was already terminated", process_id);
                            }
                        }
                    }
                    println!("[FLASK_STOP] Process tree terminated successfully");
                    // Wait a bit to ensure termination
                    tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
                }
                Err(e) => {
                    let error_msg = format!("[FLASK_STOP] Failed to kill process tree (PID {}): {}", pid, e);
                    eprintln!("{}", error_msg);
                    crate::logger::log_error(&error_msg);
                    // Fall through to try process.kill()
                }
            }
        }
    }
    
    // Fallback: Try to kill the process using CommandChild.kill()
    if let Some(process) = process {
        println!("[FLASK_STOP] Found Flask process, attempting to kill using CommandChild.kill()...");
        
        // Try to kill the process (this takes ownership of process)
        let kill_result = process.kill();
        match kill_result {
            Ok(_) => {
                println!("[FLASK_STOP] Flask process kill signal sent");
                // Wait a bit for process to terminate
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                println!("[FLASK_STOP] Flask process terminated");
            }
            Err(e) => {
                let error_msg = format!("[FLASK_STOP] Failed to kill Flask process: {}", e);
                eprintln!("{}", error_msg);
                crate::logger::log_error(&error_msg);
                // Don't return error, just log it - we still want to clear state
            }
        }
    } else {
        println!("[FLASK_STOP] No Flask process found, nothing to stop");
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
        if let Some(port_file) = app_handle.path().app_data_dir()
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
