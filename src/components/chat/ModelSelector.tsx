import React from 'react';
import { OllamaModel } from '@/types';
import { useI18n } from '@/i18n/i18n';
import styles from './ModelSelector.module.scss';

interface ModelSelectorProps {
  models: OllamaModel[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModel,
  onModelChange,
  disabled = false,
}) => {
  const { t } = useI18n();
  
  return (
    <select
      value={selectedModel}
      onChange={(e) => onModelChange(e.target.value)}
      disabled={disabled || models.length === 0}
      className={styles.modelSelector}
    >
      {models.length === 0 ? (
        <option value=''>{t('modelSelector.noModelsAvailable')}</option>
      ) : (
        models.map((model) => (
          <option
            key={model.name}
            value={model.model}
          >
            {model.name}
          </option>
        ))
      )}
    </select>
  );
};

export default ModelSelector;
