#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod api;
mod commands;
mod diagnostics;
mod logger;
mod python_http;
mod python_lifecycle;
mod python_server;

use commands::{
    check_python_server_status, get_database_path, get_flask_port, start_python_server,
    stop_python_server, stop_python_server_internal, PythonServer,
};
use diagnostics::{backup_chat_database, export_diagnostic_bundle, restore_chat_database};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Manager, RunEvent};
use tokio::sync::Mutex as TokioMutex;

static CLOSING: AtomicBool = AtomicBool::new(false);

fn main() {
    #[cfg_attr(not(feature = "e2e-testing"), allow(unused_mut))]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init());

    #[cfg(feature = "e2e-testing")]
    {
        use tauri_plugin_playwright::PluginConfig;
        let pw_cfg = match std::env::var("TAURI_PLAYWRIGHT_SOCKET") {
            Ok(p) if !p.trim().is_empty() => PluginConfig::new().socket_path(p.trim()),
            _ => PluginConfig::default(),
        };
        builder = builder.plugin(tauri_plugin_playwright::init_with_config(pw_cfg));
    }

    builder
        .manage(TokioMutex::new(PythonServer::new()))
        .invoke_handler(tauri::generate_handler![
            start_python_server,
            stop_python_server,
            check_python_server_status,
            get_database_path,
            get_flask_port,
            export_diagnostic_bundle,
            backup_chat_database,
            restore_chat_database,
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
                // Do not set CLOSING here; RunEvent::ExitRequested owns shutdown.
                // Do not call prevent_close(); the window closes immediately.
                // Flask is stopped from RunEvent::ExitRequested.
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                RunEvent::ExitRequested { api, .. } => {
                    // Avoid duplicate shutdown work if exit is requested again.
                    if CLOSING.swap(true, Ordering::SeqCst) {
                        // Already closing; skip duplicate cleanup (no extra logs).
                        return;
                    }

                    println!("[APP_EXIT] Exit requested, starting Flask cleanup");

                    // Defer process exit until async Flask shutdown completes.
                    api.prevent_exit();

                    let app_handle_clone = app_handle.clone();

                    // Stop Flask asynchronously, then allow the process to exit.
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

                        // Cleanup finished; exit the application.
                        println!("[APP_EXIT] Cleanup completed, allowing application to exit");
                        app_handle_clone.exit(0);
                    });
                }
                _ => {}
            }
        });
}
