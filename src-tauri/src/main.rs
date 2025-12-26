#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod logger;

use commands::{
    check_python_server_status, get_database_path, get_flask_port, start_python_server,
    stop_python_server, stop_python_server_internal, PythonServer,
};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Manager, RunEvent};
use tokio::sync::Mutex as TokioMutex;

static CLOSING: AtomicBool = AtomicBool::new(false);

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
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

            // Show window after content is loaded
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(debug_assertions)]
                {
                    window.open_devtools();
                }
                
                // Wait a bit for content to load, then show window
                let window_clone = window.clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
                    let _ = window_clone.show();
                });
            }

            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // 不设置 CLOSING，让 RunEvent::ExitRequested 来处理关闭逻辑
                // 不调用 prevent_close()，让窗口立即关闭
                // Flask 会在 RunEvent::ExitRequested 中关闭
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                RunEvent::ExitRequested { api, .. } => {
                    // 检查是否已经在处理退出流程，防止重复执行
                    if CLOSING.swap(true, Ordering::SeqCst) {
                        // 如果已经在关闭中，直接返回，不重复执行
                        // 不打印日志，避免干扰
                        return;
                    }

                    println!("[APP_EXIT] Exit requested, starting Flask cleanup");

                    // 防止应用立即退出，确保清理完成
                    api.prevent_exit();

                    let app_handle_clone = app_handle.clone();

                    // 异步关闭 Flask，然后允许退出
                    tauri::async_runtime::spawn(async move {
                        if let Some(server_state) =
                            app_handle_clone.try_state::<TokioMutex<PythonServer>>()
                        {
                            println!("[APP_EXIT] Stopping Flask server...");
                            match stop_python_server_internal(&app_handle_clone, &server_state)
                                .await
                            {
                                Ok(_) => {
                                    println!("[APP_EXIT] Flask server stopped successfully");
                                }
                                Err(e) => {
                                    let error_msg =
                                        format!("[APP_EXIT] Error stopping Flask server: {}", e);
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
