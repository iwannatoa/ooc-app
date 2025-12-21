import { useI18n, availableLocales } from '@/i18n';
import { useMockMode } from '@/hooks/useMockMode';
import ServerStatus from './ServerStatus';
import styles from '../styles.module.scss';

interface AppHeaderProps {
  onOpenSettings: () => void;
}

export const AppHeader = ({ onOpenSettings }: AppHeaderProps) => {
  const { locale, setLocale, t } = useI18n();
  const { mockModeEnabled, toggleMockMode, isDev } = useMockMode();

  return (
    <div className={styles.header}>
      <h1>{t('app.title')}</h1>
      <div className={styles.headerRight}>
        {isDev && (
          <button
            onClick={toggleMockMode}
            className={`${styles.mockToggleBtn} ${
              mockModeEnabled ? styles.active : ''
            }`}
            title={
              mockModeEnabled
                ? t('app.mockModeTooltipOn')
                : t('app.mockModeTooltipOff')
            }
          >
            {mockModeEnabled ? t('app.mockModeOn') : t('app.mockModeOff')}
          </button>
        )}
        <button
          onClick={() => {
            const currentIndex = availableLocales.indexOf(locale);
            const nextIndex = (currentIndex + 1) % availableLocales.length;
            setLocale(availableLocales[nextIndex]);
          }}
          className={styles.languageBtn}
          title={t('app.switchLanguage')}
        >
          {locale === 'zh' ? 'EN' : '中'}
        </button>
        <ServerStatus />
        <button
          onClick={onOpenSettings}
          className={styles.settingsBtn}
        >
          {t('common.settings')}
        </button>
      </div>
    </div>
  );
};

