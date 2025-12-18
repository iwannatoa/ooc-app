import React, { useState } from 'react';
import { ConversationSummary } from '@/types';
import styles from './SummaryPrompt.module.scss';

interface SummaryPromptProps {
  conversationId: string;
  messageCount: number;
  onGenerate: () => Promise<string>;
  onSave: (summary: string) => Promise<void>;
  onCancel: () => void;
}

const SummaryPrompt: React.FC<SummaryPromptProps> = ({
  conversationId,
  messageCount,
  onGenerate,
  onSave,
  onCancel,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generated = await onGenerate();
      setGeneratedSummary(generated);
      setSummary(generated);
    } catch (error) {
      console.error('Failed to generate summary:', error);
      alert(`生成总结失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!summary.trim()) {
      alert('请填写总结内容');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(summary.trim());
    } catch (error) {
      console.error('Failed to save summary:', error);
      alert(`保存总结失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>故事总结</h2>
          <button className={styles.closeButton} onClick={onCancel}>
            ×
          </button>
        </div>
        <div className={styles.content}>
          <div className={styles.info}>
            <p>
              当前会话已有 <strong>{messageCount}</strong> 条消息。
              为了减少 token 消耗，建议对故事进行总结。
            </p>
            <p className={styles.note}>
              总结后，完整的故事内容仍会保存在数据库中，但后续对话将使用总结内容作为上下文，以减少 token 计算。
            </p>
          </div>

          <div className={styles.actions}>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={styles.generateButton}
            >
              {isGenerating ? '生成中...' : 'AI 生成总结'}
            </button>
          </div>

          {generatedSummary && (
            <div className={styles.generatedSection}>
              <div className={styles.generatedHeader}>
                <span>AI 生成的总结：</span>
                <button
                  onClick={() => {
                    setGeneratedSummary(null);
                    setSummary('');
                  }}
                  className={styles.clearButton}
                >
                  清除
                </button>
              </div>
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="summary">故事总结 *</label>
            <textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="请填写故事总结，或点击上方按钮让 AI 生成..."
              rows={10}
              required
            />
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelButton}
              disabled={isSaving}
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!summary.trim() || isSaving}
              className={styles.saveButton}
            >
              {isSaving ? '保存中...' : '确认保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryPrompt;

