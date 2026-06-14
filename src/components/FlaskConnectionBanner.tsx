import React, { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useI18n } from '@/i18n/i18n';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { useFlaskPort } from '@/hooks/useFlaskPort';
import { isMockMode } from '@/mock';
import { setFlaskPort } from '@/store/slices/serverSlice';
import { ApiResponse } from '@/types';
import { discoverFlaskPortBrowser } from '@/utils/discoverFlaskPortBrowser';
import styles from './FlaskConnectionBanner.module.scss';

const CONNECT_TIMEOUT_MS = 11_000;
const BROWSER_PROBE_DELAY_MS = 2_000;

function isTauriShell(): boolean {
  return typeof window !== 'undefined' && Boolean(window.__TAURI__);
}

const FlaskConnectionBanner: React.FC = () => {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const apiUrl = useAppSelector((s) => s.server.apiUrl);
  const { refetch } = useFlaskPort();
  const [timedOut, setTimedOut] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const visible = !isMockMode() && !apiUrl;

  useEffect(() => {
    if (!visible) {
      setTimedOut(false);
      return;
    }
    const id = window.setTimeout(() => setTimedOut(true), CONNECT_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [visible]);

  /** Browser-only: probe /api/health on localhost (same range as Tauri get_flask_port). */
  useEffect(() => {
    if (!visible || isTauriShell()) return;
    let cancelled = false;
    const id = window.setTimeout(() => {
      void (async () => {
        const port = await discoverFlaskPortBrowser();
        if (!cancelled && port != null) {
          dispatch(setFlaskPort(port));
        }
      })();
    }, BROWSER_PROBE_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [visible, dispatch]);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      if (isTauriShell()) {
        await invoke<ApiResponse<string>>('start_python_server');
        await refetch();
      } else {
        const port = await discoverFlaskPortBrowser();
        if (port != null) {
          dispatch(setFlaskPort(port));
        } else {
          await refetch();
        }
      }
      setTimedOut(false);
    } catch {
      setTimedOut(true);
    } finally {
      setRetrying(false);
    }
  }, [dispatch, refetch]);

  if (!visible) return null;

  const failed = timedOut;

  return (
    <div
      className={`${styles.banner} ${failed ? styles.bannerFailed : ''}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className={styles.text}>
        {failed ? t('serverBanner.failed') : t('serverBanner.connecting')}
      </span>
      {failed && (
        <button
          type="button"
          className={styles.retry}
          onClick={() => void handleRetry()}
          disabled={retrying}
        >
          {t('serverBanner.retry')}
        </button>
      )}
    </div>
  );
};

export default FlaskConnectionBanner;
