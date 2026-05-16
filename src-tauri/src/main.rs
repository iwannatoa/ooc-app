#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod api;
mod commands;
mod diagnostics;
mod logger;
mod profile_paths;
mod python_http;
mod python_lifecycle;
mod python_server;

use commands::{
    check_python_server_status, get_database_path, get_flask_api_token, get_flask_port,
    get_profile_data_root, frontend_log, start_python_server, switch_active_profile,
    stop_python_server, stop_python_server_internal, PythonServer,
};
use diagnostics::{backup_chat_database, export_diagnostic_bundle, restore_chat_database};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Manager, RunEvent, WindowEvent};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};
use tokio::sync::Mutex as TokioMutex;

static CLOSING: AtomicBool = AtomicBool::new(false);

fn bool_env(var_name: &str, default_value: bool) -> bool {
    match std::env::var(var_name) {
        Ok(v) => {
            let normalized = v.trim().to_ascii_lowercase();
            if normalized.is_empty() {
                default_value
            } else {
                matches!(normalized.as_str(), "1" | "true" | "yes" | "on")
            }
        }
        Err(_) => default_value,
    }
}

fn main() {
    let tray_enabled = bool_env("DESKTOP_TRAY_ENABLED", true);
    let shortcut_enabled = bool_env("DESKTOP_SHORTCUT_ENABLED", true);
    let updater_enabled = bool_env("DESKTOP_UPDATER_ENABLED", true);

    #[cfg_attr(not(feature = "e2e-testing"), allow(unused_mut))]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init());
    if shortcut_enabled {
        builder = builder.plugin(tauri_plugin_global_shortcut::Builder::new().build());
    }
    if updater_enabled {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    #[cfg(feature = "e2e-testing")]
    {
        use tauri_plugin_playwright::PluginConfig;
        let socket_path = match std::env::var("TAURI_PLAYWRIGHT_SOCKET") {
            Ok(p) if !p.trim().is_empty() => p.trim().to_string(),
            _ => "/tmp/tauri-playwright.sock".to_string(),
        };
        let pw_cfg = PluginConfig::new().socket_path(&socket_path);
        builder = builder.plugin(tauri_plugin_playwright::init_with_config(pw_cfg));
        // tauri-playwright currently detects readiness via this stdout marker.
        println!("tauri-plugin-playwright: listening on unix:{}", socket_path);
    }

    builder
        .manage(TokioMutex::new(PythonServer::new()))
        .invoke_handler(tauri::generate_handler![
            start_python_server,
            stop_python_server,
            check_python_server_status,
            get_database_path,
            get_profile_data_root,
            get_flask_api_token,
            get_flask_port,
            switch_active_profile,
            frontend_log,
            export_diagnostic_bundle,
            backup_chat_database,
            restore_chat_database,
        ])
        .setup(move |app| {
            let app_handle = app.app_handle().clone();
            if tray_enabled {
                let show_i = MenuItemBuilder::with_id("show", "Show").build(app)?;
                let quit_i = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
                let menu = MenuBuilder::new(app)
                    .item(&show_i)
                    .separator()
                    .item(&quit_i)
                    .build()?;
                let app_for_tray = app_handle.clone();
                TrayIconBuilder::new()
                    .menu(&menu)
                    .on_menu_event(move |app, event| match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => app.exit(0),
                        _ => {}
                    })
                    .on_tray_icon_event(move |_tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            if let Some(window) = app_for_tray.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    })
                    .build(app)?;
            }

            // Initialize logger
            if let Ok(app_data_dir) = app_handle.path().app_data_dir() {
                let _ = logger::init_logger(Some(&app_data_dir));
            }

            let app_for_server = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                let _ = start_python_server(
                    app_for_server.clone(),
                    app_for_server.state::<TokioMutex<PythonServer>>(),
                    None,
                    None,
                )
                .await;
            });

            if shortcut_enabled {
                let shortcut = Shortcut::new(
                    Some(Modifiers::CONTROL | Modifiers::SHIFT),
                    Code::KeyK,
                );
                let app_for_shortcut = app_handle.clone();
                if let Err(err) = app_handle.global_shortcut().on_shortcut(
                    shortcut,
                    move |_app, _shortcut, event| {
                        if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                            if let Some(window) = app_for_shortcut.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    },
                ) {
                    eprintln!("[SHORTCUT] registration skipped: {}", err);
                }
            }

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
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Tray mode: close window into background, keep process alive.
                if bool_env("DESKTOP_TRAY_ENABLED", true) {
                    api.prevent_close();
                    let _ = window.hide();
                }
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
