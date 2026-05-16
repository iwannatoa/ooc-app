import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/i18n/i18n';
import { useChatState } from '@/hooks/useChatState';
import AssistantMessageItem from './AssistantMessageItem';
import styles from './MessageList.module.scss';

const DEFAULT_ITEM_HEIGHT = 120;
const DEFAULT_VIEWPORT_HEIGHT = 680;
const OVERSCAN_PX = 320;

function getMessageKey(index: number, message: { id?: string; timestamp?: number; content?: string }) {
  if (message.id) {
    return message.id;
  }
  return `idx-${index}-${message.timestamp ?? 0}-${message.content?.length ?? 0}`;
}

const MessageList: React.FC = () => {
  const { t } = useI18n();
  const { messages, isSending: loading, storyOperation } = useChatState();
  const messageListRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(120);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(DEFAULT_VIEWPORT_HEIGHT);
  const [heightVersion, setHeightVersion] = useState(0);
  const rowHeightsRef = useRef<Map<string, number>>(new Map());
  const rowObserversRef = useRef<Map<string, ResizeObserver>>(new Map());
  const rowRefCallbacksRef = useRef<
    Map<string, (element: HTMLDivElement | null) => void>
  >(new Map());

  const aiMessages = useMemo(
    () =>
      messages.filter(
        (msg) => msg.role === 'assistant' || msg.role === 'ai'
      ),
    [messages]
  );
  const hasMoreHistory = aiMessages.length > visibleCount;
  const visibleMessages = hasMoreHistory
    ? aiMessages.slice(aiMessages.length - visibleCount)
    : aiMessages;
  const visibleMessageKeys = useMemo(
    () => visibleMessages.map((msg, index) => getMessageKey(index, msg)),
    [visibleMessages]
  );

  const lastAssistantScrollKey = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === 'assistant' || m.role === 'ai') {
        const len = m.content?.length ?? 0;
        return `${m.id ?? `i-${i}`}-${len}`;
      }
    }
    return '';
  }, [messages]);

  useEffect(() => {
    const container = messageListRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
    const rafId = window.requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [lastAssistantScrollKey, loading, storyOperation]);

  useEffect(() => {
    const container = messageListRef.current;
    if (!container) return;
    const updateHeight = () =>
      setViewportHeight(container.clientHeight || DEFAULT_VIEWPORT_HEIGHT);
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  useEffect(() => {
    const activeKeys = new Set(visibleMessageKeys);
    for (const key of Array.from(rowHeightsRef.current.keys())) {
      if (!activeKeys.has(key)) {
        rowHeightsRef.current.delete(key);
      }
    }
    for (const [key, observer] of Array.from(rowObserversRef.current.entries())) {
      if (!activeKeys.has(key)) {
        observer.disconnect();
        rowObserversRef.current.delete(key);
      }
    }
    for (const key of Array.from(rowRefCallbacksRef.current.keys())) {
      if (!activeKeys.has(key)) {
        rowRefCallbacksRef.current.delete(key);
      }
    }
  }, [visibleMessageKeys]);

  useEffect(
    () => () => {
      for (const observer of rowObserversRef.current.values()) {
        observer.disconnect();
      }
      rowObserversRef.current.clear();
      rowRefCallbacksRef.current.clear();
    },
    []
  );

  const updateRowHeight = useCallback((key: string, nextHeight: number) => {
    const normalizedHeight = Math.max(1, Math.ceil(nextHeight));
    const prevHeight = rowHeightsRef.current.get(key);
    if (prevHeight === normalizedHeight) {
      return;
    }
    rowHeightsRef.current.set(key, normalizedHeight);
    setHeightVersion((prev) => prev + 1);
  }, []);

  const getRowRef = useCallback(
    (key: string) => {
      const existing = rowRefCallbacksRef.current.get(key);
      if (existing) {
        return existing;
      }
      const callback = (element: HTMLDivElement | null) => {
        const existingObserver = rowObserversRef.current.get(key);
        if (existingObserver) {
          existingObserver.disconnect();
          rowObserversRef.current.delete(key);
        }
        if (!element) {
          return;
        }
        if (typeof ResizeObserver === 'undefined') {
          updateRowHeight(key, element.getBoundingClientRect().height);
          return;
        }
        const observer = new ResizeObserver((entries) => {
          const target = entries[0];
          if (!target) return;
          updateRowHeight(key, target.contentRect.height);
        });
        observer.observe(element);
        rowObserversRef.current.set(key, observer);
      };
      rowRefCallbacksRef.current.set(key, callback);
      return callback;
    },
    [updateRowHeight]
  );

  const prefixHeights = useMemo(() => {
    const prefix: number[] = [0];
    for (let i = 0; i < visibleMessages.length; i++) {
      const key = visibleMessageKeys[i];
      const itemHeight = rowHeightsRef.current.get(key) ?? DEFAULT_ITEM_HEIGHT;
      prefix.push(prefix[i] + itemHeight);
    }
    return prefix;
  }, [heightVersion, visibleMessageKeys, visibleMessages.length]);

  const totalItems = visibleMessages.length;
  const windowTop = Math.max(0, scrollTop - OVERSCAN_PX);
  const windowBottom = scrollTop + viewportHeight + OVERSCAN_PX;
  let startIndex = 0;
  while (startIndex < totalItems && prefixHeights[startIndex + 1] < windowTop) {
    startIndex += 1;
  }
  if (totalItems > 0 && startIndex >= totalItems) {
    startIndex = totalItems - 1;
  }
  let endIndex = startIndex;
  while (endIndex < totalItems && prefixHeights[endIndex] <= windowBottom) {
    endIndex += 1;
  }
  const topSpacer = prefixHeights[startIndex] ?? 0;
  const totalHeight = prefixHeights[totalItems] ?? 0;
  const bottomSpacer = Math.max(0, totalHeight - (prefixHeights[endIndex] ?? totalHeight));

  return (
    <div
      ref={messageListRef}
      className={styles.messageList}
      aria-busy={loading}
      aria-live="polite"
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      {hasMoreHistory && (
        <button
          type='button'
          className={styles.loadMoreButton}
          onClick={() => setVisibleCount((prev) => prev + 120)}
        >
          {t('common.loadMore')}
        </button>
      )}
      {topSpacer > 0 && (
        <div
          style={{ height: topSpacer }}
          aria-hidden='true'
        />
      )}
      {visibleMessages.slice(startIndex, endIndex).map((message, index) => {
        const listIndex = startIndex + index;
        const messageKey = visibleMessageKeys[listIndex];
        return (
          <div
            key={messageKey}
            ref={getRowRef(messageKey)}
            data-message-key={messageKey}
          >
            <AssistantMessageItem
              message={message}
              listIndex={listIndex}
            />
          </div>
        );
      })}
      {bottomSpacer > 0 && (
        <div
          style={{ height: bottomSpacer }}
          aria-hidden='true'
        />
      )}
      {loading && (
        <div
          className={`${styles.message} ${styles.assistant} ${styles.loading}`}
          aria-live="polite"
        >
          <div className={styles.typingIndicator}>
            <span></span>
            <span></span>
            <span></span>
          </div>
          {t('messages.thinking')}
        </div>
      )}
    </div>
  );
};

export default MessageList;
