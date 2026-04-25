use std::sync::Arc;
use tauri_plugin_shell::process::CommandChild;
use tokio::sync::Mutex as TokioMutex;

pub struct PythonServer {
    pub process: Option<CommandChild>,
    pub port: Option<u16>,
    pub pid: Option<u32>,
    /// Windows: `tokio::process::Child` for graceful wait / kill (not used on other OS).
    #[cfg(target_os = "windows")]
    pub windows_child: Option<Arc<TokioMutex<Option<tokio::process::Child>>>>,
}

impl PythonServer {
    pub fn new() -> Self {
        Self {
            process: None,
            port: None,
            pid: None,
            #[cfg(target_os = "windows")]
            windows_child: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_initializes_empty_state() {
        let s = PythonServer::new();
        assert!(s.process.is_none());
        assert!(s.port.is_none());
        assert!(s.pid.is_none());
        #[cfg(target_os = "windows")]
        assert!(s.windows_child.is_none());
    }
}
