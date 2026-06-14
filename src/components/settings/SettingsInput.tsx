import React from 'react';
import { useI18n } from '@/i18n/i18n';
import styles from './SettingsPanel.module.scss';

export type FieldType = 'text' | 'number' | 'password' | 'checkbox' | 'select';

export interface SelectOption {
  value: string;
  labelKey: string;
}

export interface SettingsInputProps {
  type: FieldType;
  labelKey: string;
  value: string | number | boolean;
  onChange: (value: string | number | boolean) => void;
  placeholder?: string;
  placeholderKey?: string;
  placeholderParams?: Record<string, string>;
  min?: number;
  max?: number;
  step?: number;
  options?: SelectOption[];
  required?: boolean;
  validate?: (value: string | number | boolean) => boolean;
  parseValue?: (value: string) => string | number | boolean;
}

export const SettingsInput: React.FC<SettingsInputProps> = ({
  type,
  labelKey,
  value,
  onChange,
  placeholder,
  placeholderKey,
  placeholderParams,
  min,
  max,
  step,
  options,
  required,
  validate,
  parseValue,
}) => {
  const { t } = useI18n();

  const isEmpty =
    value === '' || value === null || value === undefined;
  const isValid = validate ? validate(value) : !isEmpty;
  const showWarning = required && !isValid;

  const displayPlaceholder = placeholderKey
    ? t(placeholderKey, placeholderParams)
    : placeholder || '';

  const handleChange = (inputValue: string | boolean) => {
    const parsedValue = parseValue
      ? parseValue(
          typeof inputValue === 'boolean'
            ? inputValue.toString()
            : inputValue
        )
      : inputValue;
    onChange(parsedValue);
  };

  if (type === 'checkbox') {
    return (
      <div className={styles.settingItem}>
        <label>
          <input
            type='checkbox'
            checked={value === true}
            onChange={(e) => handleChange(e.target.checked)}
          />
          {t(labelKey)}
        </label>
      </div>
    );
  }

  if (type === 'select') {
    return (
      <div className={styles.settingItem}>
        <label>{t(labelKey)}</label>
        <select
          value={value as string}
          onChange={(e) => handleChange(e.target.value)}
          className={showWarning ? styles.inputWarning : ''}
        >
          {options?.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {t(option.labelKey)}
            </option>
          ))}
        </select>
        {showWarning && (
          <div className={styles.warningMessage}>
            {t('settingsPanel.fieldRequired')}
          </div>
        )}
      </div>
    );
  }

  // Text, number, or password input
  const inputValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
      ? value
      : '';

  return (
    <div className={styles.settingItem}>
      <label>{t(labelKey)}</label>
      <input
        type={type}
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={displayPlaceholder}
        min={min}
        max={max}
        step={step}
        className={showWarning ? styles.inputWarning : ''}
      />
      {showWarning && (
        <div className={styles.warningMessage}>
          {t('settingsPanel.fieldRequired')}
        </div>
      )}
    </div>
  );
};

