import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModelSelector from '../ModelSelector';
import * as useI18n from '@/i18n/i18n';

vi.mock('@/i18n/i18n');

describe('ModelSelector', () => {
  const mockOnModelChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useI18n.useI18n as any).mockReturnValue({
      t: (key: string) => key,
    });
  });

  it('should render model selector', () => {
    const models = [
      { name: 'Model 1', model: 'model1' },
      { name: 'Model 2', model: 'model2' },
    ];

    render(
      <ModelSelector
        models={models}
        selectedModel='model1'
        onModelChange={mockOnModelChange}
      />
    );

    expect(screen.getByDisplayValue('Model 1')).toBeInTheDocument();
  });

  it('should show no models available', () => {
    render(
      <ModelSelector
        models={[]}
        selectedModel=''
        onModelChange={mockOnModelChange}
      />
    );

    expect(
      screen.getByText('modelSelector.noModelsAvailable')
    ).toBeInTheDocument();
  });

  it('should be able to change model', () => {
    const models = [
      { name: 'Model 1', model: 'model1' },
      { name: 'Model 2', model: 'model2' },
    ];

    render(
      <ModelSelector
        models={models}
        selectedModel='model1'
        onModelChange={mockOnModelChange}
      />
    );

    const select = screen.getByDisplayValue('Model 1');
    fireEvent.change(select, { target: { value: 'model2' } });

    expect(mockOnModelChange).toHaveBeenCalledWith('model2');
  });

  it('should disable selector when disabled', () => {
    const models = [{ name: 'Model 1', model: 'model1' }];

    render(
      <ModelSelector
        models={models}
        selectedModel='model1'
        onModelChange={mockOnModelChange}
        disabled={true}
      />
    );

    const select = screen.getByDisplayValue('Model 1');
    expect(select).toBeDisabled();
  });
});
