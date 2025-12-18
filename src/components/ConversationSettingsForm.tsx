import React, { useState, useEffect } from 'react';
import { ConversationSettings } from '@/types';
import { useConversationClient } from '@/hooks/useConversationClient';
import { useSettingsState } from '@/hooks/useSettingsState';
import styles from './ConversationSettingsForm.module.scss';

interface ConversationSettingsFormProps {
  conversationId: string;
  settings?: ConversationSettings;
  onSave: (settings: Partial<ConversationSettings>) => void;
  onCancel: () => void;
  isNewConversation?: boolean;
}

const ConversationSettingsForm: React.FC<ConversationSettingsFormProps> = ({
  conversationId,
  settings,
  onSave,
  onCancel,
  isNewConversation = false,
}) => {
  const [title, setTitle] = useState(settings?.title || '');
  const [background, setBackground] = useState(settings?.background || '');
  const [characters, setCharacters] = useState<string[]>(
    settings?.characters || ['']
  );
  const [characterPersonality, setCharacterPersonality] = useState<
    Record<string, string>
  >(settings?.character_personality || {});
  const [outline, setOutline] = useState(settings?.outline || '');
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [generatedOutline, setGeneratedOutline] = useState<string | null>(null);
  const [outlineConfirmed, setOutlineConfirmed] = useState(false);
  
  const conversationClient = useConversationClient();
  const { settings: appSettings } = useSettingsState();

  const handleAddCharacter = () => {
    setCharacters([...characters, '']);
  };

  const handleRemoveCharacter = (index: number) => {
    const newCharacters = characters.filter((_, i) => i !== index);
    setCharacters(newCharacters);
    const characterName = characters[index];
    if (characterName && characterPersonality[characterName]) {
      const newPersonality = { ...characterPersonality };
      delete newPersonality[characterName];
      setCharacterPersonality(newPersonality);
    }
  };

  const handleCharacterChange = (index: number, value: string) => {
    const newCharacters = [...characters];
    const oldName = newCharacters[index];
    newCharacters[index] = value;

    if (oldName && characterPersonality[oldName]) {
      const newPersonality = { ...characterPersonality };
      if (value) {
        newPersonality[value] = newPersonality[oldName];
      }
      if (oldName !== value) {
        delete newPersonality[oldName];
      }
      setCharacterPersonality(newPersonality);
    }

    setCharacters(newCharacters);
  };

  const handlePersonalityChange = (characterName: string, value: string) => {
    setCharacterPersonality({
      ...characterPersonality,
      [characterName]: value,
    });
  };

  const handleGenerateOutline = async () => {
    if (!background.trim()) {
      alert('请先填写故事背景');
      return;
    }
    
    const validCharacters = characters.filter((c) => c.trim() !== '');
    if (validCharacters.length === 0) {
      alert('请至少添加一个人物');
      return;
    }

    setIsGeneratingOutline(true);
    try {
      const validPersonality: Record<string, string> = {};
      validCharacters.forEach((char) => {
        if (characterPersonality[char]) {
          validPersonality[char] = characterPersonality[char];
        }
      });

      const provider = appSettings.ai.provider;
      const config = appSettings.ai[provider];
      
      const generated = await conversationClient.generateOutline(
        background.trim(),
        validCharacters,
        validPersonality,
        conversationId,  // 传递 conversationId，使用数据库中的 API 配置
        provider,
        config.model,
        provider === 'deepseek' ? config.apiKey : '',
        config.baseUrl,
        config.maxTokens,
        config.temperature
      );
      
      setGeneratedOutline(generated);
      setOutlineConfirmed(false);
    } catch (error) {
      console.error('Failed to generate outline:', error);
      alert(`生成大纲失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleConfirmOutline = () => {
    if (generatedOutline) {
      setOutline(generatedOutline);
      setOutlineConfirmed(true);
      setGeneratedOutline(null);
    }
  };

  const handleRegenerateOutline = () => {
    setGeneratedOutline(null);
    setOutlineConfirmed(false);
    handleGenerateOutline();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalOutline = outline.trim();
    if (!finalOutline && isNewConversation) {
      try {
        setIsGeneratingOutline(true);
        const validCharacters = characters.filter((c) => c.trim() !== '');
        const validPersonality: Record<string, string> = {};
        validCharacters.forEach((char) => {
          if (characterPersonality[char]) {
            validPersonality[char] = characterPersonality[char];
          }
        });

        const provider = appSettings.ai.provider;
        const config = appSettings.ai[provider];
        
        finalOutline = await conversationClient.generateOutline(
          background.trim(),
          validCharacters,
          validPersonality,
          conversationId,
          provider,
          config.model,
          provider === 'deepseek' ? config.apiKey : '',
          config.baseUrl,
          config.maxTokens,
          config.temperature
        );
      } catch (error) {
        console.error('Failed to generate outline:', error);
        alert(`自动生成大纲失败: ${error instanceof Error ? error.message : '未知错误'}`);
        setIsGeneratingOutline(false);
        return;
      } finally {
        setIsGeneratingOutline(false);
      }
    }
    
    const validCharacters = characters.filter((c) => c.trim() !== '');
    const validPersonality: Record<string, string> = {};
    validCharacters.forEach((char) => {
      if (characterPersonality[char]) {
        validPersonality[char] = characterPersonality[char];
      }
    });

    try {
      await onSave({
        conversation_id: conversationId,
        title: title.trim() || undefined,
        background: background.trim() || undefined,
        characters: validCharacters.length > 0 ? validCharacters : undefined,
        character_personality:
          Object.keys(validPersonality).length > 0
            ? validPersonality
            : undefined,
        outline: finalOutline || undefined,
      });
      
      if (finalOutline && (outlineConfirmed || generatedOutline)) {
        try {
          await conversationClient.confirmOutline(conversationId);
        } catch (error) {
          console.error('Failed to confirm outline:', error);
        }
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{isNewConversation ? '新建会话设置' : '编辑会话设置'}</h2>
          <button className={styles.closeButton} onClick={onCancel}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="title">会话标题（可选）</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：奇幻冒险故事"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="background">故事背景 *</label>
            <textarea
              id="background"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="描述故事发生的背景、世界观等..."
              rows={4}
              required={isNewConversation}
            />
          </div>

          <div className={styles.field}>
            <label>
              人物 *
              <button
                type="button"
                onClick={handleAddCharacter}
                className={styles.addButton}
              >
                + 添加人物
              </button>
            </label>
            {characters.map((char, index) => (
              <div key={index} className={styles.characterRow}>
                <input
                  type="text"
                  value={char}
                  onChange={(e) => handleCharacterChange(index, e.target.value)}
                  placeholder="人物名称"
                  required={isNewConversation && index === 0}
                  className={styles.characterInput}
                />
                {char && (
                  <input
                    type="text"
                    value={characterPersonality[char] || ''}
                    onChange={(e) =>
                      handlePersonalityChange(char, e.target.value)
                    }
                    placeholder="性格描述（可选）"
                    className={styles.personalityInput}
                  />
                )}
                {characters.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCharacter(index)}
                    className={styles.removeButton}
                  >
                    删除
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className={styles.field}>
            <label htmlFor="outline">
              大纲（可选）
              {background.trim() && characters.some(c => c.trim()) && (
                <button
                  type="button"
                  onClick={handleGenerateOutline}
                  disabled={isGeneratingOutline}
                  className={styles.generateButton}
                >
                  {isGeneratingOutline ? '生成中...' : 'AI生成大纲'}
                </button>
              )}
            </label>
            
            {generatedOutline && !outlineConfirmed && (
              <div className={styles.generatedOutline}>
                <div className={styles.generatedHeader}>
                  <span>AI生成的大纲：</span>
                  <div className={styles.generatedActions}>
                    <button
                      type="button"
                      onClick={handleConfirmOutline}
                      className={styles.confirmButton}
                    >
                      确认使用
                    </button>
                    <button
                      type="button"
                      onClick={handleRegenerateOutline}
                      disabled={isGeneratingOutline}
                      className={styles.regenerateButton}
                    >
                      重新生成
                    </button>
                  </div>
                </div>
                <div className={styles.generatedContent}>{generatedOutline}</div>
              </div>
            )}
            
            <textarea
              id="outline"
              value={outline}
              onChange={(e) => {
                setOutline(e.target.value);
                setOutlineConfirmed(true);
              }}
              placeholder={
                isNewConversation && !outline.trim()
                  ? "故事大纲、主要情节等...（留空将自动生成）"
                  : "故事大纲、主要情节等..."
              }
              rows={5}
            />
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={onCancel} className={styles.cancelButton}>
              取消
            </button>
            <button type="submit" className={styles.submitButton}>
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConversationSettingsForm;

