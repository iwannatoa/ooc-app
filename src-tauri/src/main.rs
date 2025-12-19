#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;

use commands::{check_python_server_status, get_database_path, get_flask_port, start_python_server, stop_python_server, PythonServer};
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
            get_database_path,
            get_flask_port,
        ])
        .setup(|app| {
            let app_handle = app.app_handle().clone();
            
            let app_handle_for_signal = app_handle.clone();
            ctrlc::set_handler(move || {
                let handle = tokio::runtime::Handle::try_current();
                if let Ok(rt) = handle {
                    rt.block_on(async {
                        if let Some(server_state) = app_handle_for_signal.try_state::<TokioMutex<PythonServer>>() {
                            use commands::stop_python_server_internal;
                            let _ = stop_python_server_internal(&app_handle_for_signal, &server_state).await;
                        }
                    });
                }
                std::process::exit(0);
            }).expect("Failed to set Ctrl+C handler");
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
                let app_handle = window.app_handle().clone();
                api.prevent_close();
                
                tauri::async_runtime::spawn(async move {
                    if let Some(server_state) = app_handle.try_state::<TokioMutex<PythonServer>>() {
                        use commands::stop_python_server_internal;
                        let _ = stop_python_server_internal(&app_handle, &server_state).await;
                    }
                    if let Some(w) = app_handle.get_webview_window("main") {
                        let _ = w.close();
                    }
                });
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
