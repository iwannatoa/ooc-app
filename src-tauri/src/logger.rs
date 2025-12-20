use std::fs::OpenOptions;
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

const MAX_LOG_FILE_SIZE: u64 = 10 * 1024 * 1024; // 10MB
const MAX_LOG_BACKUP_COUNT: usize = 5;
const MAX_TOTAL_LOG_SIZE: u64 = MAX_LOG_FILE_SIZE * MAX_LOG_BACKUP_COUNT as u64; // ~50MB

static LOG_FILE: Mutex<Option<PathBuf>> = Mutex::new(None);

pub fn init_logger(app_data_dir: Option<&Path>) -> io::Result<()> {
    let log_dir = if let Some(app_dir) = app_data_dir {
        let log_dir = app_dir.join("logs");
        std::fs::create_dir_all(&log_dir)?;
        log_dir
    } else {
        PathBuf::from("logs")
    };

    let log_file = log_dir.join("rust_error.log");

    // Initialize log file path
    let mut log_path = LOG_FILE.lock().unwrap();
    *log_path = Some(log_file);
    drop(log_path);

    // Clean up old logs
    cleanup_old_logs(&log_dir);

    Ok(())
}

pub fn log_error(message: &str) {
    if let Ok(log_path) = LOG_FILE.lock() {
        if let Some(ref path) = *log_path {
            if let Err(e) = write_to_log_file(path, message) {
                eprintln!("Failed to write to log file: {}", e);
            }
        }
    }
}

fn write_to_log_file(log_file: &Path, message: &str) -> io::Result<()> {
    // Check if file exists and its size
    let needs_rotation = if log_file.exists() {
        let metadata = std::fs::metadata(log_file)?;
        metadata.len() >= MAX_LOG_FILE_SIZE
    } else {
        false
    };

    if needs_rotation {
        rotate_log_file(log_file)?;
    }

    // Open file in append mode
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_file)?;

    // Write log entry with timestamp
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    writeln!(file, "[{}] ERROR: {}", timestamp, message)?;
    file.flush()?;

    // Clean up old logs periodically (every 10 writes)
    if std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs()
        % 10
        == 0
    {
        if let Some(log_dir) = log_file.parent() {
            cleanup_old_logs(log_dir);
        }
    }

    Ok(())
}

fn rotate_log_file(log_file: &Path) -> io::Result<()> {
    // Rotate existing files: rust_error.log.N -> rust_error.log.N+1
    for i in (1..=MAX_LOG_BACKUP_COUNT).rev() {
        let old_file = log_file.with_extension(format!("log.{}", i));
        let new_file = log_file.with_extension(format!("log.{}", i + 1));

        if old_file.exists() {
            if i >= MAX_LOG_BACKUP_COUNT {
                // Remove oldest file
                let _ = std::fs::remove_file(&old_file);
            } else {
                std::fs::rename(&old_file, &new_file)?;
            }
        }
    }

    // Move current log to rust_error.log.1
    if log_file.exists() {
        let rotated_file = log_file.with_extension("log.1");
        std::fs::rename(log_file, &rotated_file)?;
    }

    Ok(())
}

fn cleanup_old_logs(log_dir: &Path) {
    let log_files: Vec<PathBuf> = std::fs::read_dir(log_dir)
        .ok()
        .and_then(|entries| {
            entries
                .filter_map(|entry| entry.ok())
                .filter_map(|entry| {
                    let path = entry.path();
                    if path
                        .file_name()
                        .and_then(|n| n.to_str())
                        .map(|n| n.starts_with("rust_error.log"))
                        .unwrap_or(false)
                    {
                        Some(path)
                    } else {
                        None
                    }
                })
                .collect::<Vec<_>>()
                .into()
        })
        .unwrap_or_default();

    let total_size: u64 = log_files
        .iter()
        .filter_map(|p| std::fs::metadata(p).ok())
        .map(|m| m.len())
        .sum();

    if total_size > MAX_TOTAL_LOG_SIZE {
        // Sort by modification time (oldest first)
        let mut files_with_time: Vec<(PathBuf, u64)> = log_files
            .into_iter()
            .filter_map(|p| {
                std::fs::metadata(&p)
                    .ok()
                    .and_then(|m| m.modified().ok())
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| (p, d.as_secs()))
            })
            .collect();

        files_with_time.sort_by_key(|(_, time)| *time);

        // Remove oldest files until total size is under limit
        let mut current_size = total_size;
        for (file, _) in files_with_time {
            if current_size <= MAX_TOTAL_LOG_SIZE {
                break;
            }

            if let Ok(size) = std::fs::metadata(&file).map(|m| m.len()) {
                if std::fs::remove_file(&file).is_ok() {
                    current_size -= size;
                }
            }
        }
    }
}

// Macro to log errors
#[macro_export]
macro_rules! rust_log_error {
    ($($arg:tt)*) => {
        {
            let message = format!($($arg)*);
            eprintln!("{}", message);
            $crate::logger::log_error(&message);
        }
    };
}
