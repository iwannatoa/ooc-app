import React, { useState, useEffect } from 'react';
import { useI18n } from '@/i18n';
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
  
  // 当 think 内容从开放状态变为闭合状态时，自动折叠并触发完成回调
  useEffect(() => {
    if (wasOpen && !isOpen) {
      setIsCollapsed(true);
      onComplete?.();
    }
    setWasOpen(isOpen);
  }, [isOpen, wasOpen, onComplete]);
  
  // 如果 think 内容还在开放状态，自动展开
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

