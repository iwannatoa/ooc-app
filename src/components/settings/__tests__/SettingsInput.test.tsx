import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { SettingsInput, SelectOption } from '../SettingsInput';

// Mock i18n
vi.mock('@/i18n/i18n', () => ({
  useI18n: vi.fn(() => ({
    t: (key: string, params?: any) => {
      if (params) {
        return `${key} ${JSON.stringify(params)}`;
      }
      return key;
    },
  })),
}));

describe('SettingsInput', () => {
  let user: ReturnType<typeof userEvent.setup>;
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
  });

  describe('Text input', () => {
    it('should render text input with value', () => {
      render(
        <SettingsInput
          type='text'
          labelKey='test.label'
          value='test value'
          onChange={mockOnChange}
        />
      );
      const input = screen.getByDisplayValue('test value') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.value).toBe('test value');
      expect(screen.getByText('test.label')).toBeInTheDocument();
    });

    it('should call onChange when value changes', async () => {
      render(
        <SettingsInput
          type='text'
          labelKey='test.label'
          value=''
          onChange={mockOnChange}
        />
      );
      const input = screen.getByRole('textbox');
      await user.type(input, 'new value');
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should show warning for required empty field', () => {
      render(
        <SettingsInput
          type='text'
          labelKey='test.label'
          value=''
          onChange={mockOnChange}
          required
          validate={(v) => typeof v === 'string' && v.trim().length > 0}
        />
      );
      expect(screen.getByText('settingsPanel.fieldRequired')).toBeInTheDocument();
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('inputWarning');
    });

    it('should handle boolean value by converting to empty string', () => {
      render(
        <SettingsInput
          type='text'
          labelKey='test.label'
          value={false as any}
          onChange={mockOnChange}
        />
      );
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('should display placeholder', () => {
      render(
        <SettingsInput
          type='text'
          labelKey='test.label'
          value=''
          onChange={mockOnChange}
          placeholder='Enter value'
        />
      );
      const input = screen.getByPlaceholderText('Enter value') as HTMLInputElement;
      expect(input).toBeInTheDocument();
    });

    it('should display placeholder from key', () => {
      render(
        <SettingsInput
          type='text'
          labelKey='test.label'
          value=''
          onChange={mockOnChange}
          placeholderKey='test.placeholder'
        />
      );
      const input = screen.getByPlaceholderText('test.placeholder') as HTMLInputElement;
      expect(input).toBeInTheDocument();
    });

    it('should display placeholder with params', () => {
      render(
        <SettingsInput
          type='text'
          labelKey='test.label'
          value=''
          onChange={mockOnChange}
          placeholderKey='test.placeholder'
          placeholderParams={{ name: 'test' }}
        />
      );
      const input = screen.getByPlaceholderText(/test\.placeholder/) as HTMLInputElement;
      expect(input.placeholder).toContain('test.placeholder');
      expect(input.placeholder).toContain('test');
    });
  });

  describe('Number input', () => {
    it('should render number input with value', () => {
      render(
        <SettingsInput
          type='number'
          labelKey='test.label'
          value={42}
          onChange={mockOnChange}
        />
      );
      const input = screen.getByDisplayValue('42') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.type).toBe('number');
    });

    it('should show warning for required empty number field', () => {
      render(
        <SettingsInput
          type='number'
          labelKey='test.label'
          value=''
          onChange={mockOnChange}
          required
          validate={(v) => typeof v === 'number' && v > 0}
        />
      );
      expect(screen.getByText('settingsPanel.fieldRequired')).toBeInTheDocument();
    });

    it('should apply min, max, and step attributes', () => {
      render(
        <SettingsInput
          type='number'
          labelKey='test.label'
          value={5}
          onChange={mockOnChange}
          min={0}
          max={10}
          step={0.1}
        />
      );
      const input = screen.getByDisplayValue('5') as HTMLInputElement;
      expect(input.min).toBe('0');
      expect(input.max).toBe('10');
      expect(input.step).toBe('0.1');
    });
  });

  describe('Password input', () => {
    it('should render password input', () => {
      render(
        <SettingsInput
          type='password'
          labelKey='test.label'
          value='secret'
          onChange={mockOnChange}
        />
      );
      const input = screen.getByDisplayValue('secret') as HTMLInputElement;
      expect(input.type).toBe('password');
    });
  });

  describe('Checkbox input', () => {
    it('should render checkbox when checked', () => {
      render(
        <SettingsInput
          type='checkbox'
          labelKey='test.label'
          value={true}
          onChange={mockOnChange}
        />
      );
      const checkbox = screen.getByLabelText('test.label') as HTMLInputElement;
      expect(checkbox.type).toBe('checkbox');
      expect(checkbox.checked).toBe(true);
    });

    it('should render checkbox when unchecked', () => {
      render(
        <SettingsInput
          type='checkbox'
          labelKey='test.label'
          value={false}
          onChange={mockOnChange}
        />
      );
      const checkbox = screen.getByLabelText('test.label') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('should call onChange when checkbox is toggled', async () => {
      render(
        <SettingsInput
          type='checkbox'
          labelKey='test.label'
          value={false}
          onChange={mockOnChange}
        />
      );
      const checkbox = screen.getByLabelText('test.label');
      await user.click(checkbox);
      expect(mockOnChange).toHaveBeenCalledWith(true);
    });

    it('should use parseValue for checkbox', async () => {
      const parseValue = vi.fn((v) => v === 'true');
      render(
        <SettingsInput
          type='checkbox'
          labelKey='test.label'
          value={false}
          onChange={mockOnChange}
          parseValue={parseValue}
        />
      );
      const checkbox = screen.getByLabelText('test.label');
      await user.click(checkbox);
      expect(parseValue).toHaveBeenCalledWith('true');
    });
  });

  describe('Select input', () => {
    const options: SelectOption[] = [
      { value: 'option1', labelKey: 'test.option1' },
      { value: 'option2', labelKey: 'test.option2' },
    ];

    it('should render select with options', () => {
      render(
        <SettingsInput
          type='select'
          labelKey='test.label'
          value='option1'
          onChange={mockOnChange}
          options={options}
        />
      );
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select).toBeInTheDocument();
      expect(select.value).toBe('option1');
      expect(select.querySelectorAll('option')).toHaveLength(2);
    });

    it('should call onChange when selection changes', async () => {
      render(
        <SettingsInput
          type='select'
          labelKey='test.label'
          value='option1'
          onChange={mockOnChange}
          options={options}
        />
      );
      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'option2');
      expect(mockOnChange).toHaveBeenCalledWith('option2');
    });

    it('should show warning for required empty select', () => {
      render(
        <SettingsInput
          type='select'
          labelKey='test.label'
          value=''
          onChange={mockOnChange}
          options={options}
          required
          validate={(v) => typeof v === 'string' && v.length > 0}
        />
      );
      expect(screen.getByText('settingsPanel.fieldRequired')).toBeInTheDocument();
      const select = screen.getByRole('combobox');
      expect(select.className).toContain('inputWarning');
    });

    it('should use parseValue for select', async () => {
      const parseValue = vi.fn((v) => v.toUpperCase());
      render(
        <SettingsInput
          type='select'
          labelKey='test.label'
          value='option1'
          onChange={mockOnChange}
          options={options}
          parseValue={parseValue}
        />
      );
      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'option2');
      expect(parseValue).toHaveBeenCalledWith('option2');
      expect(mockOnChange).toHaveBeenCalledWith('OPTION2');
    });
  });

  describe('Validation', () => {
    it('should not show warning when validate returns true', () => {
      render(
        <SettingsInput
          type='text'
          labelKey='test.label'
          value='valid'
          onChange={mockOnChange}
          required
          validate={(v) => typeof v === 'string' && v.length > 0}
        />
      );
      expect(
        screen.queryByText('settingsPanel.fieldRequired')
      ).not.toBeInTheDocument();
    });

    it('should show warning when validate returns false', () => {
      render(
        <SettingsInput
          type='text'
          labelKey='test.label'
          value=''
          onChange={mockOnChange}
          required
          validate={(v) => typeof v === 'string' && v.trim().length > 0}
        />
      );
      expect(screen.getByText('settingsPanel.fieldRequired')).toBeInTheDocument();
    });

    it('should not show warning for non-required fields', () => {
      render(
        <SettingsInput
          type='text'
          labelKey='test.label'
          value=''
          onChange={mockOnChange}
          validate={(v) => typeof v === 'string' && v.length > 0}
        />
      );
      expect(
        screen.queryByText('settingsPanel.fieldRequired')
      ).not.toBeInTheDocument();
    });
  });
});

