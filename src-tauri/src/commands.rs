use tauri::{AppHandle, Manager, State};
use tokio::sync::Mutex as TokioMutex;

use crate::api::ApiResponse;
use crate::python_http::{add_flask_security_headers, flask_instance_id_from_env};
use crate::python_lifecycle::run_start_python_server;

pub use crate::python_lifecycle::stop_python_server_internal;
pub use crate::python_server::PythonServer;

fn redact_frontend_message(message: &str) -> String {
    let mut redacted = message.replace("Bearer ", "Bearer <redacted>");
    redacted = redacted.replace("sk-", "sk-<redacted>");
    redacted = redacted.replace("C:\\Users\\", "C:\\Users\\<redacted>\\");
    redacted = redacted.replace("/Users/", "/Users/<redacted>/");
    redacted = redacted.replace("/home/", "/home/<redacted>/");
    redacted
}

fn read_port_from_file(app_handle: &AppHandle) -> Option<u16> {
    let port_file = app_handle.path().app_data_dir().ok()?.join("port.txt");
    let port_str = std::fs::read_to_string(port_file).ok()?;
    port_str.trim().parse::<u16>().ok()
}

#[derive(serde::Deserialize)]
struct FlaskHealthResponse {
    #[allow(dead_code)]
    status: Option<String>,
    instance_id: Option<String>,
}

async fn probe_flask_health_with_instance(
    client: &reqwest::Client,
    port: u16,
    expected_instance_id: Option<&str>,
) -> bool {
    let req = add_flask_security_headers(
        client
            .get(format!("http://127.0.0.1:{}/api/health", port))
            .timeout(std::time::Duration::from_millis(500)),
    );
    match req.send().await {
        Ok(response) => {
            if !response.status().is_success() {
                return false;
            }
            match expected_instance_id {
                Some(expected) if !expected.is_empty() => match response.json::<FlaskHealthResponse>().await
                {
                    Ok(payload) => payload.instance_id.as_deref() == Some(expected),
                    Err(_) => false,
                },
                _ => true,
            }
        }
        Err(_) => false,
    }
}

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
    let client = reqwest::Client::new();
    let server = server_state.lock().await;
    let expected_instance_id = server
        .instance_id
        .clone()
        .or_else(flask_instance_id_from_env);
    if let Some(port) = server.port {
        if probe_flask_health_with_instance(&client, port, expected_instance_id.as_deref()).await {
            return Ok(ApiResponse {
                success: true,
                data: Some(port),
                error: None,
            });
        }
    }

    drop(server);
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    let server = server_state.lock().await;
    if let Some(port) = server.port {
        if probe_flask_health_with_instance(&client, port, expected_instance_id.as_deref()).await {
            return Ok(ApiResponse {
                success: true,
                data: Some(port),
                error: None,
            });
        }
    }

    drop(server);

    if let Some(port) = read_port_from_file(&app_handle) {
        if probe_flask_health_with_instance(&client, port, expected_instance_id.as_deref()).await {
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

    // Last-resort fallback scan only when we know expected ownership instance.
    if let Some(expected_instance_id) = expected_instance_id.as_deref() {
        let mut tasks = Vec::new();
        for port in 5000..=5100 {
            let client_clone = client.clone();
            let expected = expected_instance_id.to_string();
            let task = tokio::spawn(async move {
                if probe_flask_health_with_instance(&client_clone, port, Some(expected.as_str())).await
                {
                    return Some(port);
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
pub async fn get_flask_api_token() -> Result<ApiResponse<String>, String> {
    match std::env::var("FLASK_API_TOKEN") {
        Ok(token) if !token.trim().is_empty() => Ok(ApiResponse {
            success: true,
            data: Some(token),
            error: None,
        }),
        _ => Ok(ApiResponse {
            success: false,
            data: None,
            error: Some("FLASK_API_TOKEN is not set".to_string()),
        }),
    }
}

#[tauri::command]
pub async fn check_python_server_status(
    app_handle: AppHandle,
    server_state: State<'_, TokioMutex<PythonServer>>,
) -> Result<ApiResponse<bool>, String> {
    let server = server_state.lock().await;
    let expected_instance_id = server
        .instance_id
        .clone()
        .or_else(flask_instance_id_from_env);

    let port = server
        .port
        .or_else(|| read_port_from_file(&app_handle))
        .unwrap_or(5000);

    let client = reqwest::Client::new();
    if probe_flask_health_with_instance(&client, port, expected_instance_id.as_deref()).await {
        Ok(ApiResponse {
            success: true,
            data: Some(true),
            error: None,
        })
    } else {
        Ok(ApiResponse {
            success: false,
            data: Some(false),
            error: Some("Cannot connect to owned server instance".to_string()),
        })
    }
}

#[tauri::command]
pub fn frontend_log(level: String, message: String) -> Result<ApiResponse<String>, String> {
    let normalized_level = level.trim().to_ascii_lowercase();
    let bounded_message: String = message.chars().take(12000).collect();
    let redacted_message = redact_frontend_message(&bounded_message);
    let formatted = format!("[FRONTEND_{}] {}", normalized_level, redacted_message);

    if normalized_level == "error" {
        eprintln!("{}", formatted);
        crate::logger::log_error(&formatted);
    } else if normalized_level == "warn" {
        eprintln!("{}", formatted);
    } else {
        println!("{}", formatted);
    }

    Ok(ApiResponse {
        success: true,
        data: Some("logged".to_string()),
        error: None,
    })
}
