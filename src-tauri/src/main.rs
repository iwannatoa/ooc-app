#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod logger;

use commands::{check_python_server_status, get_database_path, get_flask_port, start_python_server, stop_python_server, stop_python_server_internal, PythonServer};
use tauri::{Manager, RunEvent};
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
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // 标记正在关闭
                CLOSING.store(true, Ordering::SeqCst);
                // 允许窗口立即关闭，不阻塞用户界面
                println!("[WINDOW_CLOSE] Window close requested, allowing immediate close");
                // 不调用 prevent_close()，让窗口立即关闭
                // Flask 会在 RunEvent::ExitRequested 中关闭
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                RunEvent::ExitRequested { api, .. } => {
                    // 检查是否已经在处理退出流程，防止无限循环
                    if CLOSING.load(Ordering::SeqCst) {
                        println!("[APP_EXIT] Already closing, allowing immediate exit");
                        return;
                    }
                    
                    println!("[APP_EXIT] Exit requested, starting Flask cleanup");
                    
                    // 标记正在关闭
                    CLOSING.store(true, Ordering::SeqCst);
                    
                    // 防止应用立即退出，确保清理完成
                    api.prevent_exit();
                    
                    let app_handle_clone = app_handle.clone();
                    
                    // 异步关闭 Flask，然后允许退出
                    tauri::async_runtime::spawn(async move {
                        if let Some(server_state) = app_handle_clone.try_state::<TokioMutex<PythonServer>>() {
                            println!("[APP_EXIT] Stopping Flask server...");
                            match stop_python_server_internal(&app_handle_clone, &server_state).await {
                                Ok(_) => {
                                    println!("[APP_EXIT] Flask server stopped successfully");
                                }
                                Err(e) => {
                                    let error_msg = format!("[APP_EXIT] Error stopping Flask server: {}", e);
                                    eprintln!("{}", error_msg);
                                    logger::log_error(&error_msg);
                                }
                            }
                        } else {
                            println!("[APP_EXIT] No server state found, skipping Flask shutdown");
                        }
                        
                        // 清理完成后，允许应用退出
                        println!("[APP_EXIT] Cleanup completed, allowing application to exit");
                        app_handle_clone.exit(0);
                    });
                }
                _ => {}
            }
        });
}
