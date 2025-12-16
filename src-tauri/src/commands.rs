use reqwest;
use serde::Serialize;
use tauri::{AppHandle, State};
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

// 管理Python进程状态
pub struct PythonServer {
    pub process: Option<CommandChild>,
}

impl PythonServer {
    pub fn new() -> Self {
        Self { process: None }
    }
}

// 启动Python Flask服务器
#[tauri::command]
pub async fn start_python_server(
    app_handle: AppHandle,
    server_state: State<'_, TokioMutex<PythonServer>>,
) -> Result<ApiResponse<String>, String> {
    let mut server = server_state.lock().await;

    println!("启动Python服务器..., 现有服务: {:?}", server.process);
    // 如果服务器已经在运行，先停止
    if let Some(_) = server.process {
        let _ = stop_python_server(server_state.clone()).await;
    }

    let command = match app_handle.shell().sidecar("flask-api") {
        Ok(cmd) => cmd,
        Err(e) => {
            println!("Flask服务器启动失败: {}", e);
            return Ok(ApiResponse {
                success: false,
                data: None,
                error: Some(format!("无法找到嵌入的Python服务器可执行文件: {}", e)),
            });
        }
    };

    // 启动Python进程
    match command.spawn() {
        Ok((mut rx, child)) => {
            println!("Flask服务器启动: {:?}", child.pid());
            server.process = Some(child);
            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            println!("Flask: {}", String::from_utf8_lossy(&line));
                        }
                        // Flask will send the further log from here.
                        CommandEvent::Stderr(line) => {
                            eprintln!("Flask: {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Terminated(payload) => {
                            println!("Flask terminated: {:?}", payload);
                            break;
                        }
                        _ => {}
                    }
                }
            });

            // 等待服务器启动
            tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;

            Ok(ApiResponse {
                success: true,
                data: Some("Python Flask服务器启动成功".to_string()),
                error: None,
            })
        }
        Err(e) => {
            println!("Flask服务器 Failed: {}", e);
            Ok(ApiResponse {
                success: false,
                data: None,
                error: Some(format!("启动Python服务器失败: {}", e)),
            })
        }
    }
}

// 停止Python服务器
#[tauri::command]
pub async fn stop_python_server(
    server_state: State<'_, TokioMutex<PythonServer>>,
) -> Result<ApiResponse<String>, String> {
    let mut server = server_state.lock().await;
    if let Some(_) = server.process {
        let client = reqwest::Client::new();

        let result = client.post("http://localhost:5000/api/stop").send().await;
        match result {
            Ok(_) => {
                server.process = None;
                Ok(ApiResponse {
                    success: true,
                    data: Some("Python服务器已停止".to_string()),
                    error: None,
                })
            }
            Err(e) => Ok(ApiResponse {
                success: false,
                data: None,
                error: Some(format!("停止服务器失败: {}", e)),
            }),
        }
    } else {
        Ok(ApiResponse {
            success: false,
            data: None,
            error: Some("没有运行的服务器".to_string()),
        })
    }
}

// 检查Python服务器状态
#[tauri::command]
pub async fn check_python_server_status() -> ApiResponse<bool> {
    let client = reqwest::Client::new();

    match client
        .get("http://localhost:5000/api/health")
        .timeout(std::time::Duration::from_secs(3))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                ApiResponse {
                    success: true,
                    data: Some(true),
                    error: None,
                }
            } else {
                ApiResponse {
                    success: false,
                    data: Some(false),
                    error: Some("服务器响应异常".to_string()),
                }
            }
        }
        Err(_) => ApiResponse {
            success: false,
            data: Some(false),
            error: Some("无法连接到服务器".to_string()),
        },
    }
}
