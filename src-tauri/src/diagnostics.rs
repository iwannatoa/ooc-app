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
use crate::profile_paths::resolve_profile_root;
use crate::python_lifecycle::run_start_python_server;
use crate::python_lifecycle::stop_python_server_internal;
use crate::python_server::PythonServer;
use crate::{
    api::ApiResponse,
    backup_crypto::{
        build_manifest_and_encrypt, decrypt_payload, validate_manifest, BackupArtifact,
        BackupErrorCode, BackupManifest,
    },
};

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

fn collect_story_library_files(root: &Path) -> Vec<PathBuf> {
    let mut out = Vec::new();
    if !root.exists() {
        return out;
    }
    if root.is_file() {
        out.push(root.to_path_buf());
        return out;
    }
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        if let Ok(entries) = std::fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    stack.push(path);
                } else if path.is_file() {
                    out.push(path);
                }
            }
        }
    }
    out
}

fn build_plain_backup_payload(
    profile_db_path: &Path,
    profile_root: &Path,
    settings_json: Option<&str>,
) -> Result<(Vec<u8>, Vec<BackupArtifact>), BackupErrorCode> {
    let mut artifacts = Vec::new();
    let mut cursor = std::io::Cursor::new(Vec::<u8>::new());
    let mut zip = ZipWriter::new(&mut cursor);
    let opts = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);

    if profile_db_path.is_file() {
        let bytes = std::fs::read(profile_db_path).map_err(|_| BackupErrorCode::Io)?;
        artifacts.push(BackupArtifact {
            path: "profile/chat.db".to_string(),
            size_bytes: bytes.len() as u64,
        });
        zip.start_file("profile/chat.db", opts)
            .map_err(|_| BackupErrorCode::Io)?;
        zip.write_all(&bytes).map_err(|_| BackupErrorCode::Io)?;
    }

    let story_library_root = profile_root.join("story-library");
    for file in collect_story_library_files(&story_library_root) {
        let relative = file
            .strip_prefix(&story_library_root)
            .map_err(|_| BackupErrorCode::Io)?
            .to_string_lossy()
            .replace('\\', "/");
        let bytes = std::fs::read(&file).map_err(|_| BackupErrorCode::Io)?;
        let path = format!("profile/story-library/{}", relative);
        artifacts.push(BackupArtifact {
            path: path.clone(),
            size_bytes: bytes.len() as u64,
        });
        zip.start_file(path, opts).map_err(|_| BackupErrorCode::Io)?;
        zip.write_all(&bytes).map_err(|_| BackupErrorCode::Io)?;
    }

    let settings_payload = settings_json.unwrap_or("{}");
    zip.start_file("profile/settings.json", opts)
        .map_err(|_| BackupErrorCode::Io)?;
    zip.write_all(settings_payload.as_bytes())
        .map_err(|_| BackupErrorCode::Io)?;
    artifacts.push(BackupArtifact {
        path: "profile/settings.json".to_string(),
        size_bytes: settings_payload.len() as u64,
    });

    let diagnostics_summary = serde_json::json!({
        "created_at_unix": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0),
        "db_path_redacted": redact_path(&profile_db_path.to_string_lossy()),
    });
    let diagnostics_bytes =
        serde_json::to_vec_pretty(&diagnostics_summary).map_err(|_| BackupErrorCode::Io)?;
    zip.start_file("profile/diagnostics-summary.json", opts)
        .map_err(|_| BackupErrorCode::Io)?;
    zip.write_all(&diagnostics_bytes)
        .map_err(|_| BackupErrorCode::Io)?;
    artifacts.push(BackupArtifact {
        path: "profile/diagnostics-summary.json".to_string(),
        size_bytes: diagnostics_bytes.len() as u64,
    });

    zip.finish().map_err(|_| BackupErrorCode::Io)?;
    Ok((cursor.into_inner(), artifacts))
}

fn extract_payload_to_temp_profile(
    decrypted_payload: &[u8],
    temp_dir: &Path,
) -> Result<PathBuf, BackupErrorCode> {
    let cursor = std::io::Cursor::new(decrypted_payload);
    let mut archive = zip::ZipArchive::new(cursor).map_err(|_| BackupErrorCode::CorruptedPackage)?;
    let profile_root = temp_dir.join("profile");
    std::fs::create_dir_all(&profile_root).map_err(|_| BackupErrorCode::Io)?;
    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|_| BackupErrorCode::CorruptedPackage)?;
        let name = file.name().replace('\\', "/");
        if !name.starts_with("profile/") {
            continue;
        }
        let rel = name.trim_start_matches("profile/");
        if rel.is_empty() {
            continue;
        }
        let target = profile_root.join(rel);
        if file.is_dir() {
            std::fs::create_dir_all(&target).map_err(|_| BackupErrorCode::Io)?;
            continue;
        }
        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent).map_err(|_| BackupErrorCode::Io)?;
        }
        let mut out = File::create(&target).map_err(|_| BackupErrorCode::Io)?;
        std::io::copy(&mut file, &mut out).map_err(|_| BackupErrorCode::Io)?;
    }
    Ok(profile_root)
}

fn api_error(code: BackupErrorCode) -> ApiResponse<String> {
    ApiResponse {
        success: false,
        data: None,
        error: Some(code.as_str().to_string()),
    }
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

#[tauri::command]
pub async fn export_encrypted_backup_bundle(
    app_handle: AppHandle,
    dest_path: String,
    profile_id: Option<String>,
    password: String,
    profile_fingerprint: Option<String>,
    settings_json: Option<String>,
) -> Result<ApiResponse<String>, String> {
    let (_, db_path) = match resolve_profile_db_path(&app_handle, profile_id.as_deref()) {
        Ok(value) => value,
        Err(_) => return Ok(api_error(BackupErrorCode::Io)),
    };
    let (_, profile_root) = match resolve_profile_root(&app_handle, profile_id.as_deref()) {
        Ok(value) => value,
        Err(_) => return Ok(api_error(BackupErrorCode::Io)),
    };
    let (plain_payload, artifacts) =
        match build_plain_backup_payload(&db_path, &profile_root, settings_json.as_deref()) {
            Ok(value) => value,
            Err(code) => return Ok(api_error(code)),
        };
    let (manifest, encrypted_payload) = match build_manifest_and_encrypt(
        &plain_payload,
        &password,
        env!("CARGO_PKG_VERSION"),
        profile_fingerprint,
        artifacts,
    ) {
        Ok(value) => value,
        Err(code) => return Ok(api_error(code)),
    };

    let dest = PathBuf::from(dest_path);
    if let Some(parent) = dest.parent() {
        if std::fs::create_dir_all(parent).is_err() {
            return Ok(api_error(BackupErrorCode::Io));
        }
    }
    let file = match File::create(&dest) {
        Ok(file) => file,
        Err(_) => return Ok(api_error(BackupErrorCode::Io)),
    };
    let mut zip = ZipWriter::new(file);
    let opts = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
    let manifest_bytes = match serde_json::to_vec_pretty(&manifest) {
        Ok(bytes) => bytes,
        Err(_) => return Ok(api_error(BackupErrorCode::Io)),
    };
    if zip.start_file("manifest.json", opts).is_err() {
        return Ok(api_error(BackupErrorCode::Io));
    }
    if zip.write_all(&manifest_bytes).is_err() {
        return Ok(api_error(BackupErrorCode::Io));
    }
    if zip.start_file("payload.enc", opts).is_err() {
        return Ok(api_error(BackupErrorCode::Io));
    }
    if zip.write_all(&encrypted_payload).is_err() {
        return Ok(api_error(BackupErrorCode::Io));
    }
    if zip.finish().is_err() {
        return Ok(api_error(BackupErrorCode::Io));
    }

    Ok(ApiResponse {
        success: true,
        data: Some(dest.to_string_lossy().to_string()),
        error: None,
    })
}

#[tauri::command]
pub async fn restore_encrypted_backup_bundle(
    app_handle: AppHandle,
    server_state: State<'_, TokioMutex<PythonServer>>,
    src_path: String,
    profile_id: Option<String>,
    password: String,
    story_library_path: Option<String>,
) -> Result<ApiResponse<String>, String> {
    let src = PathBuf::from(src_path);
    if !src.is_file() {
        return Ok(api_error(BackupErrorCode::CorruptedPackage));
    }
    let file = match File::open(&src) {
        Ok(file) => file,
        Err(_) => return Ok(api_error(BackupErrorCode::Io)),
    };
    let mut archive = match zip::ZipArchive::new(file) {
        Ok(archive) => archive,
        Err(_) => return Ok(api_error(BackupErrorCode::CorruptedPackage)),
    };
    let manifest: BackupManifest = {
        let mut mf = match archive.by_name("manifest.json") {
            Ok(file) => file,
            Err(_) => return Ok(api_error(BackupErrorCode::CorruptedPackage)),
        };
        let mut bytes = Vec::new();
        if std::io::Read::read_to_end(&mut mf, &mut bytes).is_err() {
            return Ok(api_error(BackupErrorCode::CorruptedPackage));
        }
        match serde_json::from_slice(&bytes) {
            Ok(value) => value,
            Err(_) => return Ok(api_error(BackupErrorCode::CorruptedPackage)),
        }
    };
    if let Err(code) = validate_manifest(&manifest) {
        return Ok(api_error(code));
    }
    let encrypted_payload = {
        let mut payload = match archive.by_name("payload.enc") {
            Ok(file) => file,
            Err(_) => return Ok(api_error(BackupErrorCode::CorruptedPackage)),
        };
        let mut bytes = Vec::new();
        if std::io::Read::read_to_end(&mut payload, &mut bytes).is_err() {
            return Ok(api_error(BackupErrorCode::CorruptedPackage));
        }
        bytes
    };
    let decrypted = match decrypt_payload(&manifest, &encrypted_payload, &password) {
        Ok(value) => value,
        Err(code) => return Ok(api_error(code)),
    };

    let profile_value = profile_id
        .or_else(|| std::env::var("ACTIVE_PROFILE_ID").ok())
        .unwrap_or_else(|| "default".to_string());
    let (_, target_root) = match resolve_profile_root(&app_handle, Some(&profile_value)) {
        Ok(value) => value,
        Err(_) => return Ok(api_error(BackupErrorCode::Io)),
    };
    let parent_root = target_root
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| PathBuf::from("."));
    let temp_dir = parent_root.join(format!(".restore_tmp_{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&temp_dir);
    if std::fs::create_dir_all(&temp_dir).is_err() {
        return Ok(api_error(BackupErrorCode::Io));
    }
    let extracted_profile = match extract_payload_to_temp_profile(&decrypted, &temp_dir) {
        Ok(value) => value,
        Err(code) => return Ok(api_error(code)),
    };

    if let Err(_) = stop_python_server_internal(&app_handle, &*server_state).await {
        return Ok(api_error(BackupErrorCode::Io));
    }
    tokio::time::sleep(tokio::time::Duration::from_millis(800)).await;

    let backup_root = parent_root.join("profile.pre-restore.bak");
    if backup_root.exists() {
        let _ = std::fs::remove_dir_all(&backup_root);
    }
    if target_root.exists() {
        if std::fs::rename(&target_root, &backup_root).is_err() {
            return Ok(api_error(BackupErrorCode::Io));
        }
    }
    if std::fs::rename(&extracted_profile, &target_root).is_err() {
        return Ok(api_error(BackupErrorCode::Io));
    }
    let _ = std::fs::remove_dir_all(&temp_dir);

    let restarted = run_start_python_server(
        app_handle.clone(),
        server_state,
        Some(profile_value),
        story_library_path,
    )
    .await?;
    if !restarted.success {
        return Ok(api_error(BackupErrorCode::Io));
    }

    Ok(ApiResponse {
        success: true,
        data: Some(target_root.to_string_lossy().to_string()),
        error: None,
    })
}
