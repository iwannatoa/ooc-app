//! Local diagnostic bundle (no network): zip with redacted metadata + recent Rust error logs.
//! Backup / restore chat SQLite via copy while coordinating Flask lifecycle for restore.

use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::{AppHandle, Manager, State};
use tokio::sync::Mutex as TokioMutex;
use zip::write::{SimpleFileOptions, ZipWriter};
use zip::CompressionMethod;

use crate::profile_paths::resolve_profile_db_path;
use crate::python_lifecycle::run_start_python_server;
use crate::python_lifecycle::stop_python_server_internal;
use crate::python_server::PythonServer;

fn redact_path(p: &str) -> String {
    let mut s = p.to_string();
    // Windows user folder
    if let Some(idx) = s.find("\\Users\\") {
        if let Some(rest) = s[idx + 7..].find('\\') {
            let end = idx + 7 + rest;
            s.replace_range(idx + 7..end, "<redacted>");
        }
    }
    // Unix home
    if s.starts_with("/home/") {
        if let Some(p2) = s[6..].find('/') {
            s.replace_range(6..6 + p2, "<redacted>");
        }
    }
    s
}

fn redact_sensitive_text(input: &str) -> String {
    let mut redacted = redact_path(input);
    redacted = redacted.replace("C:\\Users\\", "C:\\Users\\<redacted>\\");
    redacted = redacted.replace("/Users/", "/Users/<redacted>/");
    redacted = redacted.replace("/home/", "/home/<redacted>/");
    redacted = redacted.replace("Bearer ", "Bearer <redacted>");
    redacted = redacted.replace("sk-", "sk-<redacted>");
    redacted
}

fn read_tail_bytes(path: &Path, max: usize) -> Option<Vec<u8>> {
    let mut f = File::open(path).ok()?;
    let len = f.metadata().ok()?.len() as usize;
    let skip = len.saturating_sub(max);
    let mut buf = vec![0u8; len - skip];
    std::io::Seek::seek(&mut f, std::io::SeekFrom::Start(skip as u64)).ok()?;
    f.read_exact(&mut buf).ok()?;
    Some(buf)
}

#[derive(Serialize)]
struct DiagnosticMeta {
    app_version: String,
    os: String,
    arch: String,
    timestamp_unix: u64,
    database_path_redacted: Option<String>,
    port_file_contents: Option<String>,
    profile_fingerprint: Option<String>,
}

/// Build `ooc-diagnostics.zip` at `zip_path` (parent must exist).
#[tauri::command]
pub async fn export_diagnostic_bundle(
    app_handle: AppHandle,
    zip_path: String,
    profile_fingerprint: Option<String>,
    profile_id: Option<String>,
) -> Result<String, String> {
    let zip_path = PathBuf::from(zip_path);
    if let Some(parent) = zip_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let file = File::create(&zip_path).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(file);
    let opts = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);

    let app_data = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let db_path: Option<String> = resolve_profile_db_path(&app_handle, profile_id.as_deref())
        .ok()
        .map(|(_, path)| path.to_string_lossy().into_owned());

    let port_file = app_data.join("port.txt");
    let port_contents = std::fs::read_to_string(&port_file)
        .ok()
        .map(|raw| redact_sensitive_text(&raw));

    let meta = DiagnosticMeta {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        timestamp_unix: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0),
        database_path_redacted: db_path.as_ref().map(|p| redact_path(p)),
        port_file_contents: port_contents.clone(),
        profile_fingerprint,
    };

    let json = serde_json::to_string_pretty(&meta).map_err(|e| e.to_string())?;
    zip.start_file("diagnostic.json", opts)
        .map_err(|e| e.to_string())?;
    zip.write_all(json.as_bytes()).map_err(|e| e.to_string())?;

    if let Some(ref pc) = port_contents {
        zip.start_file("port.txt", opts)
            .map_err(|e| e.to_string())?;
        zip.write_all(pc.as_bytes()).map_err(|e| e.to_string())?;
    }

    let log_dir = app_data.join("logs");
    let rust_log_file = log_dir.join("rust_error.log");
    if rust_log_file.is_file() {
        if let Some(tail) = read_tail_bytes(&rust_log_file, 256 * 1024) {
            zip.start_file("logs/rust_error.tail.log", opts)
                .map_err(|e| e.to_string())?;
            zip.write_all(&tail).map_err(|e| e.to_string())?;
        }
    }

    let python_log_file = log_dir.join("python_error.log");
    if python_log_file.is_file() {
        if let Some(tail) = read_tail_bytes(&python_log_file, 256 * 1024) {
            let redacted_tail = redact_sensitive_text(&String::from_utf8_lossy(&tail));
            zip.start_file("logs/python_error.tail.log", opts)
                .map_err(|e| e.to_string())?;
            zip.write_all(redacted_tail.as_bytes())
                .map_err(|e| e.to_string())?;
        }
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(zip_path.to_string_lossy().into_owned())
}

/// Copy `chat.db` to `dest_path` (file). May be inconsistent if DB is mid-write; prefer idle app.
#[tauri::command]
pub async fn backup_chat_database(
    app_handle: AppHandle,
    dest_path: String,
    profile_id: Option<String>,
) -> Result<String, String> {
    let (_, src) = resolve_profile_db_path(&app_handle, profile_id.as_deref())?;
    if !src.is_file() {
        return Err("chat.db not found in app data directory".to_string());
    }
    let dest = PathBuf::from(&dest_path);
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::copy(&src, &dest).map_err(|e| e.to_string())?;
    Ok(dest.to_string_lossy().into_owned())
}

/// Replace `chat.db` from `src_path` after stopping Flask; then restart Flask.
#[tauri::command]
pub async fn restore_chat_database(
    app_handle: AppHandle,
    server_state: State<'_, TokioMutex<PythonServer>>,
    src_path: String,
    profile_id: Option<String>,
    story_library_path: Option<String>,
) -> Result<String, String> {
    let src = PathBuf::from(src_path);
    if !src.is_file() {
        return Err("Source backup file does not exist".to_string());
    }
    let requested_profile = profile_id
        .or_else(|| std::env::var("ACTIVE_PROFILE_ID").ok())
        .unwrap_or_else(|| "default".to_string());
    let (_, dest) = resolve_profile_db_path(&app_handle, Some(&requested_profile))?;
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    stop_python_server_internal(&app_handle, &*server_state)
        .await
        .map_err(|e| format!("stop flask: {}", e))?;
    tokio::time::sleep(tokio::time::Duration::from_millis(1200)).await;

    // Keep a single pre-restore copy if dest exists
    if dest.is_file() {
        let bak = dest
            .parent()
            .unwrap_or_else(|| std::path::Path::new("."))
            .join("chat.pre-restore.bak.db");
        let _ = std::fs::remove_file(&bak);
        std::fs::rename(&dest, &bak).map_err(|e| e.to_string())?;
    }
    std::fs::copy(&src, &dest).map_err(|e| e.to_string())?;

    let start = run_start_python_server(
        app_handle.clone(),
        server_state,
        Some(requested_profile),
        story_library_path,
    )
    .await?;
    if !start.success {
        return Err(start
            .error
            .unwrap_or_else(|| "Flask failed to restart after restore".to_string()));
    }

    Ok(dest.to_string_lossy().into_owned())
}
