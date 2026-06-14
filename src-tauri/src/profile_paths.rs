use std::path::PathBuf;

use tauri::{AppHandle, Manager};

pub const DEFAULT_PROFILE_ID: &str = "default";

pub fn sanitize_profile_id(profile_id: &str) -> String {
    let trimmed = profile_id.trim();
    if trimmed.is_empty() {
        return DEFAULT_PROFILE_ID.to_string();
    }
    let sanitized: String = trimmed
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                ch
            } else {
                '_'
            }
        })
        .collect();
    if sanitized.is_empty() {
        DEFAULT_PROFILE_ID.to_string()
    } else {
        sanitized
    }
}

pub fn normalize_profile_id(profile_id: Option<&str>) -> String {
    match profile_id {
        Some(value) => sanitize_profile_id(value),
        None => DEFAULT_PROFILE_ID.to_string(),
    }
}

pub fn resolve_profile_root(
    app_handle: &AppHandle,
    profile_id: Option<&str>,
) -> Result<(String, PathBuf), String> {
    let app_data = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let normalized = normalize_profile_id(profile_id);
    let root = app_data.join("profiles").join(&normalized);
    Ok((normalized, root))
}

pub fn resolve_profile_db_path(
    app_handle: &AppHandle,
    profile_id: Option<&str>,
) -> Result<(String, PathBuf), String> {
    let (normalized, profile_root) = resolve_profile_root(app_handle, profile_id)?;
    Ok((normalized, profile_root.join("chat.db")))
}

pub fn resolve_story_library_path(
    profile_root: &std::path::Path,
    story_library_path: Option<&str>,
) -> PathBuf {
    let configured = story_library_path.unwrap_or("").trim();
    if configured.is_empty() {
        return profile_root.join("story-library");
    }
    let path = PathBuf::from(configured);
    if path.is_absolute() {
        return path;
    }
    profile_root.join(path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitize_profile_id_keeps_safe_characters() {
        assert_eq!(sanitize_profile_id("my-profile_1"), "my-profile_1");
    }

    #[test]
    fn sanitize_profile_id_replaces_unsafe_characters() {
        assert_eq!(sanitize_profile_id("my profile:01"), "my_profile_01");
    }

    #[test]
    fn normalize_profile_id_uses_default_for_empty() {
        assert_eq!(normalize_profile_id(Some("   ")), "default");
        assert_eq!(normalize_profile_id(None), "default");
    }
}
