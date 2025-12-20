#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod logger;

use commands::{check_python_server_status, get_database_path, get_flask_port, start_python_server, stop_python_server, PythonServer};
use tauri::Manager;
use tokio::sync::Mutex as TokioMutex;
use std::sync::atomic::{AtomicBool, Ordering};

static CLOSING: AtomicBool = AtomicBool::new(false);

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(TokioMutex::new(PythonServer::new()))
        .invoke_handler(tauri::generate_handler![
            start_python_server,
            stop_python_server,
            check_python_server_status,
            get_database_path,
            get_flask_port,
        ])
        .setup(|app| {
            let app_handle = app.app_handle().clone();
            
            // Initialize logger
            if let Ok(app_data_dir) = app_handle.path().app_data_dir() {
                let _ = logger::init_logger(Some(&app_data_dir));
            }
            
            tauri::async_runtime::spawn(async move {
                let _ = start_python_server(
                    app_handle.clone(),
                    app_handle.state::<TokioMutex<PythonServer>>(),
                )
                .await;
            });

            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // 检查是否已经在关闭流程中，防止重复处理
                if CLOSING.swap(true, Ordering::SeqCst) {
                    println!("[WINDOW_CLOSE] Already closing, allowing default close behavior");
                    // 如果已经在关闭流程中，允许默认关闭行为
                    return;
                }
                
                println!("[WINDOW_CLOSE] Window close requested");
                let app_handle = window.app_handle().clone();
                api.prevent_close();
                println!("[WINDOW_CLOSE] Prevented default close behavior");
                
                // 使用 spawn 进行异步清理
                tauri::async_runtime::spawn(async move {
                    println!("[WINDOW_CLOSE] Starting cleanup task");
                    
                    // 停止 Flask 服务器
                    if let Some(server_state) = app_handle.try_state::<TokioMutex<PythonServer>>() {
                        println!("[WINDOW_CLOSE] Found server state, stopping Flask server...");
                        use commands::stop_python_server_internal;
                        match stop_python_server_internal(&app_handle, &server_state).await {
                            Ok(_) => {
                                println!("[WINDOW_CLOSE] Flask server stopped successfully");
                            }
                            Err(e) => {
                                let error_msg = format!("[WINDOW_CLOSE] Error stopping Flask server: {}", e);
                                eprintln!("{}", error_msg);
                                logger::log_error(&error_msg);
                            }
                        }
                    } else {
                        println!("[WINDOW_CLOSE] No server state found, skipping Flask server shutdown");
                    }
                    
                    // 等待一段时间确保清理完成（增加等待时间以确保进程终止）
                    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                    println!("[WINDOW_CLOSE] Cleanup delay completed");
                    
                    // 清理完成后直接退出应用，而不是关闭窗口（避免再次触发事件）
                    println!("[WINDOW_CLOSE] Exiting application...");
                    app_handle.exit(0);
                });
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
