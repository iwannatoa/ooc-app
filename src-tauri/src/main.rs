#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;

use commands::{check_python_server_status, start_python_server, stop_python_server, PythonServer};
use tauri::Manager;
use tokio::sync::Mutex as TokioMutex;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(TokioMutex::new(PythonServer::new()))
        .invoke_handler(tauri::generate_handler![
            start_python_server,
            stop_python_server,
            check_python_server_status,
        ])
        .setup(|app| {
            let app_handle = app.app_handle().clone();
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
            if let tauri::WindowEvent::Destroyed = event {
                let app_handle = window.app_handle().clone();
                tauri::async_runtime::spawn(async move {
                    println!("window destroyed");
                    if let Some(server_state) = app_handle.try_state::<TokioMutex<PythonServer>>() {
                        let _ = stop_python_server(server_state).await;
                    }
                });
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
