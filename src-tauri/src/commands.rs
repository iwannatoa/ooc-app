use tauri::{AppHandle, Manager, State};
use tokio::sync::Mutex as TokioMutex;

use crate::api::ApiResponse;
use crate::python_lifecycle::run_start_python_server;

pub use crate::python_lifecycle::stop_python_server_internal;
pub use crate::python_server::PythonServer;

#[tauri::command]
pub async fn start_python_server(
    app_handle: AppHandle,
    server_state: State<'_, TokioMutex<PythonServer>>,
) -> Result<ApiResponse<String>, String> {
    run_start_python_server(app_handle, server_state).await
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
