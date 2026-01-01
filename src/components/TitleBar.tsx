import { getCurrentWindow } from '@tauri-apps/api/window';
import { useI18n } from '@/i18n/i18n';
import styles from './TitleBar.module.scss';

export const TitleBar = () => {
  const { t } = useI18n();
  
  const handleMinimize = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  };

  const handleMaximize = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.toggleMaximize();
    } catch (error) {
      console.error('Failed to maximize window:', error);
    }
  };

  const handleClose = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };

  return (
    <div className={styles.titleBar} data-tauri-drag-region>
      <div className={styles.titleBarContent}>
        <span className={styles.title}>OOC story</span>
      </div>
      <div className={styles.titleBarControls}>
        <button
          className={styles.titleBarButton}
          onClick={handleMinimize}
          title={t('titleBar.minimize')}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              d="M2 6h8"
            />
          </svg>
        </button>
        <button
          className={styles.titleBarButton}
          onClick={handleMaximize}
          title={t('titleBar.maximize')}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2 2h8v8H2V2z"
            />
          </svg>
        </button>
        <button
          className={`${styles.titleBarButton} ${styles.closeButton}`}
          onClick={handleClose}
          title={t('titleBar.close')}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              d="M3 3l6 6M9 3l-6 6"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

