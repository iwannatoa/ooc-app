import React from 'react';
import { OllamaModel } from '@/types';
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
  return (
    <select
      value={selectedModel}
      onChange={(e) => onModelChange(e.target.value)}
      disabled={disabled || models.length === 0}
      className={styles.modelSelector}
    >
      {models.length === 0 ? (
        <option value=''>无可用模型</option>
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
