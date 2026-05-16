/**
 * Data & diagnostics: local-only backup, restore, diagnostic zip (Tauri desktop).
 */
import React, { useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { useI18n } from '@/i18n/i18n';
import { useSettingsState } from '@/hooks/useSettingsState';
import styles from './SettingsPanel.module.scss';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

const hashProfileId = async (profileId?: string): Promise<string | undefined> => {
  if (!profileId) {
    return undefined;
  }
  const normalized = profileId.trim();
  if (!normalized) {
    return undefined;
  }
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const payload = new TextEncoder().encode(normalized);
    const digest = await subtle.digest('SHA-256', payload);
    const hex = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    return hex.slice(0, 12);
  }

  let hash = 2166136261;
  for (const char of normalized) {
    hash ^= char.charCodeAt(0);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

export const DataSettings: React.FC = () => {
  const { t } = useI18n();
  const { settings } = useSettingsState();
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
  const [profileDataRoot, setProfileDataRoot] = useState<string | null>(null);

  const activeProfileId =
    settings.activeProfileId || settings.profiles?.[0]?.id || 'default';

  React.useEffect(() => {
    if (!isTauriRuntime()) {
      setProfileDataRoot(null);
      return;
    }
    invoke<{ success: boolean; data?: string }>('get_profile_data_root', {
      profileId: activeProfileId,
    })
      .then((resp) => {
        if (resp?.success && resp.data) {
          setProfileDataRoot(resp.data);
        } else {
          setProfileDataRoot(null);
        }
      })
      .catch(() => setProfileDataRoot(null));
  }, [activeProfileId]);

  const onExportDiagnostics = useCallback(async () => {
    setHint(null);
    if (!isTauriRuntime()) {
      setHint(t('settingsPanel.dataDesktopOnly'));
      return;
    }
    const path = await save({
      defaultPath: `ooc-diagnostics-${Date.now()}.zip`,
      filters: [{ name: 'ZIP', extensions: ['zip'] }],
    });
    if (!path) return;
    setBusy(true);
    try {
      const profileFingerprint = await hashProfileId(settings.activeProfileId);
      await invoke<string>('export_diagnostic_bundle', {
        zipPath: path,
        profileFingerprint,
        profileId: activeProfileId,
      });
      setHint(t('settingsPanel.dataDiagnosticsSaved'));
    } catch (e) {
      setHint(String(e));
    } finally {
      setBusy(false);
    }
  }, [activeProfileId, settings.activeProfileId, t]);

  const onBackupDb = useCallback(async () => {
    setHint(null);
    if (!isTauriRuntime()) {
      setHint(t('settingsPanel.dataDesktopOnly'));
      return;
    }
    const path = await save({
      defaultPath: `ooc-chat-backup-${Date.now()}.db`,
      filters: [{ name: 'SQLite', extensions: ['db'] }],
    });
    if (!path) return;
    setBusy(true);
    try {
      await invoke<string>('backup_chat_database', {
        destPath: path,
        profileId: activeProfileId,
      });
      setHint(t('settingsPanel.dataBackupDone'));
    } catch (e) {
      setHint(String(e));
    } finally {
      setBusy(false);
    }
  }, [activeProfileId, t]);

  const onRestoreDb = useCallback(async () => {
    setHint(null);
    if (!isTauriRuntime()) {
      setHint(t('settingsPanel.dataDesktopOnly'));
      return;
    }
    const path = await open({
      multiple: false,
      filters: [{ name: 'SQLite', extensions: ['db'] }],
    });
    if (!path || Array.isArray(path)) return;
    const ok = window.confirm(t('settingsPanel.dataRestoreConfirm'));
    if (!ok) return;
    setBusy(true);
    try {
      await invoke<string>('restore_chat_database', {
        srcPath: path,
        profileId: activeProfileId,
      });
      setHint(t('settingsPanel.dataRestoreDone'));
    } catch (e) {
      setHint(String(e));
    } finally {
      setBusy(false);
    }
  }, [activeProfileId, t]);

  const mapBackupError = (code?: string): string => {
    if (!code) {
      return t('settingsPanel.dataEncryptedUnknownError');
    }
    const mapping: Record<string, string> = {
      BACKUP_ERR_INVALID_PASSWORD: 'settingsPanel.dataEncryptedErrInvalidPassword',
      BACKUP_ERR_CORRUPTED_PACKAGE: 'settingsPanel.dataEncryptedErrCorruptedPackage',
      BACKUP_ERR_VERSION_UNSUPPORTED:
        'settingsPanel.dataEncryptedErrVersionUnsupported',
      BACKUP_ERR_IO: 'settingsPanel.dataEncryptedErrIo',
      BACKUP_ERR_CRYPTO: 'settingsPanel.dataEncryptedErrCrypto',
    };
    return t(mapping[code] || 'settingsPanel.dataEncryptedUnknownError');
  };

  const onExportEncryptedBackup = useCallback(async () => {
    setHint(null);
    if (!isTauriRuntime()) {
      setHint(t('settingsPanel.dataDesktopOnly'));
      return;
    }
    const password = window.prompt(t('settingsPanel.dataEncryptedPasswordPrompt'));
    if (!password) return;
    const confirmPassword = window.prompt(
      t('settingsPanel.dataEncryptedPasswordConfirmPrompt')
    );
    if (confirmPassword !== password) {
      setHint(t('settingsPanel.dataEncryptedPasswordMismatch'));
      return;
    }
    const path = await save({
      defaultPath: `ooc-encrypted-backup-${Date.now()}.oocbak.zip`,
      filters: [{ name: 'Encrypted Backup', extensions: ['zip', 'oocbak'] }],
    });
    if (!path) return;
    setBusy(true);
    try {
      const activeProfile =
        settings.profiles?.find((p) => p.id === activeProfileId) || null;
      const profileFingerprint = await hashProfileId(activeProfileId);
      const response = await invoke<ApiResponse<string>>(
        'export_encrypted_backup_bundle',
        {
          destPath: path,
          profileId: activeProfileId,
          password,
          profileFingerprint,
          settingsJson: JSON.stringify({
            profile: activeProfile,
            activeProfileId,
          }),
        }
      );
      if (!response.success) {
        setHint(mapBackupError(response.error));
        return;
      }
      setHint(t('settingsPanel.dataEncryptedExportDone'));
    } catch (e) {
      setHint(String(e));
    } finally {
      setBusy(false);
    }
  }, [activeProfileId, settings.profiles, t]);

  const onRestoreEncryptedBackup = useCallback(async () => {
    setHint(null);
    if (!isTauriRuntime()) {
      setHint(t('settingsPanel.dataDesktopOnly'));
      return;
    }
    const path = await open({
      multiple: false,
      filters: [{ name: 'Encrypted Backup', extensions: ['zip', 'oocbak'] }],
    });
    if (!path || Array.isArray(path)) return;
    const password = window.prompt(t('settingsPanel.dataEncryptedPasswordPrompt'));
    if (!password) return;
    setBusy(true);
    try {
      const activeProfile =
        settings.profiles?.find((p) => p.id === activeProfileId) || null;
      const response = await invoke<ApiResponse<string>>(
        'restore_encrypted_backup_bundle',
        {
          srcPath: path,
          profileId: activeProfileId,
          password,
          storyLibraryPath: activeProfile?.storyLibraryPath || null,
        }
      );
      if (!response.success) {
        setHint(mapBackupError(response.error));
        return;
      }
      setHint(t('settingsPanel.dataEncryptedRestoreDone'));
    } catch (e) {
      setHint(String(e));
    } finally {
      setBusy(false);
    }
  }, [activeProfileId, settings.profiles, t]);

  const onCheckUpdate = useCallback(async () => {
    setHint(null);
    setReleaseNotes(null);
    if (!isTauriRuntime()) {
      setHint(t('settingsPanel.dataDesktopOnly'));
      return;
    }
    setBusy(true);
    try {
      const updater = await import('@tauri-apps/plugin-updater');
      const pending = await updater.check();
      if (!pending) {
        setHint(t('settingsPanel.dataUpdaterNoUpdate'));
        return;
      }
      if (pending.body) {
        setReleaseNotes(pending.body);
      }
      setHint(
        t('settingsPanel.dataUpdaterAvailable').replace(
          '{version}',
          pending.version
        )
      );
      const shouldInstall = window.confirm(
        t('settingsPanel.dataUpdaterInstallConfirm').replace(
          '{version}',
          pending.version
        )
      );
      if (!shouldInstall) return;
      await pending.downloadAndInstall();
      setHint(t('settingsPanel.dataUpdaterInstalled'));
    } catch (e) {
      setHint(
        t('settingsPanel.dataUpdaterFailed').replace('{error}', String(e))
      );
    } finally {
      setBusy(false);
    }
  }, [t]);

  return (
    <div className={styles.settingsSection}>
      <h3>{t('settingsPanel.tabs.data')}</h3>
      <p className={styles.dataHint}>{t('settingsPanel.dataIntro')}</p>
      <p className={styles.dataHint}>
        Active profile data root: {profileDataRoot || '(not available)'}
      </p>
      <p className={styles.dataHint}>
        Story library path:{' '}
        {settings.profiles?.find((p) => p.id === activeProfileId)
          ?.storyLibraryPath || '(default in profile root)'}
      </p>
      <div className={styles.dataActions}>
        <button
          type='button'
          disabled={busy}
          onClick={onCheckUpdate}
        >
          {t('settingsPanel.dataCheckUpdate')}
        </button>
        <button
          type='button'
          disabled={busy}
          onClick={onExportDiagnostics}
        >
          {t('settingsPanel.dataExportDiagnostics')}
        </button>
        <button
          type='button'
          disabled={busy}
          onClick={onBackupDb}
        >
          {t('settingsPanel.dataBackupDb')}
        </button>
        <button
          type='button'
          disabled={busy}
          onClick={onExportEncryptedBackup}
        >
          {t('settingsPanel.dataEncryptedExport')}
        </button>
        <button
          type='button'
          disabled={busy}
          onClick={onRestoreEncryptedBackup}
        >
          {t('settingsPanel.dataEncryptedRestore')}
        </button>
        <button
          type='button'
          disabled={busy}
          onClick={onRestoreDb}
        >
          {t('settingsPanel.dataRestoreDb')}
        </button>
      </div>
      {hint ? <p className={styles.dataStatus}>{hint}</p> : null}
      {releaseNotes ? (
        <pre className={styles.dataStatus}>{releaseNotes}</pre>
      ) : null}
    </div>
  );
};

DataSettings.displayName = 'DataSettings';
