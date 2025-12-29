import React, { useState, useEffect } from 'react';
import { useI18n } from '@/i18n/i18n';
import styles from './ThinkContent.module.scss';

interface ThinkContentProps {
  content: string;
  isOpen: boolean;
  onComplete?: () => void;
}

const ThinkContent: React.FC<ThinkContentProps> = ({ content, isOpen, onComplete }) => {
  const { t } = useI18n();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [wasOpen, setWasOpen] = useState(isOpen);
  
  // When think content changes from open to closed, auto collapse and trigger completion callback
  useEffect(() => {
    if (wasOpen && !isOpen) {
      setIsCollapsed(true);
      onComplete?.();
    }
    setWasOpen(isOpen);
  }, [isOpen, wasOpen, onComplete]);
  
  // If think content is still open, auto expand
  useEffect(() => {
    if (isOpen) {
      setIsCollapsed(false);
    }
  }, [isOpen]);
  
  if (!content) return null;
  
  return (
    <div className={`${styles.thinkContent} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.thinkHeader} onClick={() => setIsCollapsed(!isCollapsed)}>
        <span className={styles.thinkLabel}>
          {isOpen ? t('messages.thinkingInProgress') : t('messages.thinkProcess')}
        </span>
        <span className={styles.collapseIcon}>
          {isCollapsed ? '▼' : '▲'}
        </span>
      </div>
      {!isCollapsed && (
        <div className={styles.thinkBody}>
          {content.split('\n').map((line, index) => (
            <div key={index} className={styles.thinkLine}>
              {line || '\u00A0'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThinkContent;

