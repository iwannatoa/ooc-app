use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use argon2::{Algorithm, Argon2, Params, Version};
use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine;
use rand::RngCore;
use serde::{Deserialize, Serialize};

pub const BACKUP_FORMAT_VERSION: u32 = 1;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BackupErrorCode {
    InvalidPassword,
    CorruptedPackage,
    VersionUnsupported,
    Io,
    Crypto,
}

impl BackupErrorCode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::InvalidPassword => "BACKUP_ERR_INVALID_PASSWORD",
            Self::CorruptedPackage => "BACKUP_ERR_CORRUPTED_PACKAGE",
            Self::VersionUnsupported => "BACKUP_ERR_VERSION_UNSUPPORTED",
            Self::Io => "BACKUP_ERR_IO",
            Self::Crypto => "BACKUP_ERR_CRYPTO",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupArtifact {
    pub path: String,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupKdf {
    pub algorithm: String,
    pub memory_kib: u32,
    pub iterations: u32,
    pub parallelism: u32,
    pub salt_b64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupCipher {
    pub algorithm: String,
    pub nonce_b64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupManifest {
    pub format_version: u32,
    pub app_version: String,
    pub profile_id_fingerprint: Option<String>,
    pub kdf: BackupKdf,
    pub cipher: BackupCipher,
    pub artifacts: Vec<BackupArtifact>,
}

pub fn build_manifest_and_encrypt(
    payload: &[u8],
    password: &str,
    app_version: &str,
    profile_id_fingerprint: Option<String>,
    artifacts: Vec<BackupArtifact>,
) -> Result<(BackupManifest, Vec<u8>), BackupErrorCode> {
    if password.is_empty() {
        return Err(BackupErrorCode::InvalidPassword);
    }

    let mut salt = [0_u8; 16];
    let mut nonce = [0_u8; 12];
    rand::thread_rng().fill_bytes(&mut salt);
    rand::thread_rng().fill_bytes(&mut nonce);

    let kdf = BackupKdf {
        algorithm: "argon2id".to_string(),
        memory_kib: 19456,
        iterations: 2,
        parallelism: 1,
        salt_b64: BASE64_STANDARD.encode(salt),
    };
    let cipher = BackupCipher {
        algorithm: "aes-256-gcm".to_string(),
        nonce_b64: BASE64_STANDARD.encode(nonce),
    };
    let manifest = BackupManifest {
        format_version: BACKUP_FORMAT_VERSION,
        app_version: app_version.to_string(),
        profile_id_fingerprint,
        kdf,
        cipher,
        artifacts,
    };

    let key = derive_key(password, &manifest.kdf)?;
    let aes = Aes256Gcm::new_from_slice(&key).map_err(|_| BackupErrorCode::Crypto)?;
    let mut nonce_value = Nonce::default();
    nonce_value.copy_from_slice(&nonce);
    let encrypted = aes
        .encrypt(&nonce_value, payload)
        .map_err(|_| BackupErrorCode::Crypto)?;
    Ok((manifest, encrypted))
}

pub fn validate_manifest(manifest: &BackupManifest) -> Result<(), BackupErrorCode> {
    if manifest.format_version != BACKUP_FORMAT_VERSION {
        return Err(BackupErrorCode::VersionUnsupported);
    }
    if manifest.kdf.algorithm != "argon2id" || manifest.cipher.algorithm != "aes-256-gcm" {
        return Err(BackupErrorCode::CorruptedPackage);
    }
    Ok(())
}

pub fn decrypt_payload(
    manifest: &BackupManifest,
    encrypted_payload: &[u8],
    password: &str,
) -> Result<Vec<u8>, BackupErrorCode> {
    validate_manifest(manifest)?;
    if password.is_empty() {
        return Err(BackupErrorCode::InvalidPassword);
    }
    let key = derive_key(password, &manifest.kdf)?;
    let nonce_bytes = BASE64_STANDARD
        .decode(&manifest.cipher.nonce_b64)
        .map_err(|_| BackupErrorCode::CorruptedPackage)?;
    if nonce_bytes.len() != 12 {
        return Err(BackupErrorCode::CorruptedPackage);
    }
    let aes = Aes256Gcm::new_from_slice(&key).map_err(|_| BackupErrorCode::Crypto)?;
    let mut nonce_value = Nonce::default();
    nonce_value.copy_from_slice(&nonce_bytes);
    aes.decrypt(&nonce_value, encrypted_payload)
        .map_err(|_| BackupErrorCode::InvalidPassword)
}

fn derive_key(password: &str, kdf: &BackupKdf) -> Result<[u8; 32], BackupErrorCode> {
    let salt = BASE64_STANDARD
        .decode(&kdf.salt_b64)
        .map_err(|_| BackupErrorCode::CorruptedPackage)?;
    let params = Params::new(kdf.memory_kib, kdf.iterations, kdf.parallelism, Some(32))
        .map_err(|_| BackupErrorCode::Crypto)?;
    let argon = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut key = [0_u8; 32];
    argon
        .hash_password_into(password.as_bytes(), &salt, &mut key)
        .map_err(|_| BackupErrorCode::Crypto)?;
    Ok(key)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn manifest_roundtrip_json() {
        let (manifest, encrypted) = build_manifest_and_encrypt(
            b"payload",
            "password",
            "0.2.0",
            Some("fingerprint".to_string()),
            vec![BackupArtifact {
                path: "profile/chat.db".to_string(),
                size_bytes: 7,
            }],
        )
        .expect("manifest");
        let json = serde_json::to_string(&manifest).expect("json");
        let decoded: BackupManifest = serde_json::from_str(&json).expect("decode");
        assert_eq!(decoded.format_version, BACKUP_FORMAT_VERSION);
        let plain = decrypt_payload(&decoded, &encrypted, "password").expect("decrypt");
        assert_eq!(plain, b"payload");
    }

    #[test]
    fn decrypt_wrong_password_returns_stable_error() {
        let (manifest, encrypted) = build_manifest_and_encrypt(
            b"payload",
            "password",
            "0.2.0",
            None,
            Vec::new(),
        )
        .expect("encrypt");
        let err = decrypt_payload(&manifest, &encrypted, "wrong").expect_err("must fail");
        assert_eq!(err, BackupErrorCode::InvalidPassword);
    }
}
