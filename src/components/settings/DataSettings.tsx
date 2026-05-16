/**
 * Data & diagnostics: local-only backup, restore, diagnostic zip (Tauri desktop).
 */
import React, { useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { useI18n } from '@/i18n/i18n';
import { useSettingsState } from '@/hooks/useSettingsState';
import styles from './SettingsPanel.module.scss';

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
      });
      setHint(t('settingsPanel.dataDiagnosticsSaved'));
    } catch (e) {
      setHint(String(e));
    } finally {
      setBusy(false);
    }
  }, [settings.activeProfileId, t]);

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
      await invoke<string>('backup_chat_database', { destPath: path });
      setHint(t('settingsPanel.dataBackupDone'));
    } catch (e) {
      setHint(String(e));
    } finally {
      setBusy(false);
    }
  }, [t]);

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
      await invoke<string>('restore_chat_database', { srcPath: path });
      setHint(t('settingsPanel.dataRestoreDone'));
    } catch (e) {
      setHint(String(e));
    } finally {
      setBusy(false);
    }
  }, [t]);

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
