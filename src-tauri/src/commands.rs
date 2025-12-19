use reqwest;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};

use tokio::sync::Mutex as TokioMutex;

#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

pub struct PythonServer {
    pub process: Option<CommandChild>,
    pub port: Option<u16>,
}

impl PythonServer {
    pub fn new() -> Self {
        Self { 
            process: None,
            port: None,
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
                            eprintln!("Flask: {}", String::from_utf8_lossy(&line));
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

pub(crate) async fn stop_python_server_internal(
    _: &AppHandle,
    server_state: &TokioMutex<PythonServer>,
) -> Result<(), String> {
    println!("[FLASK_STOP] Starting Flask server stop procedure");
    let mut server = server_state.lock().await;
    
    if let Some(port) = server.port {
        println!("[FLASK_STOP] Current Flask port: {}", port);
    } else {
        println!("[FLASK_STOP] No Flask port recorded");
    }
    
    if let Some(process) = server.process.take() {
        println!("[FLASK_STOP] Found Flask process, attempting to kill...");
        // Kill the process directly by PID instead of using API
        let kill_result = process.kill();
        match kill_result {
            Ok(_) => {
                println!("[FLASK_STOP] Flask process killed successfully");
            }
            Err(e) => {
                eprintln!("[FLASK_STOP] Failed to kill Flask process: {}", e);
                return Err(format!("Failed to kill process: {}", e));
            }
        }
        
        server.port = None;
        println!("[FLASK_STOP] Cleared Flask port from server state");
    } else {
        println!("[FLASK_STOP] No Flask process found, nothing to stop");
    }
    
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
            eprintln!("[FLASK_STOP] stop_python_server command failed: {}", e);
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
