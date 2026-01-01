import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { AutoGenerationOptions } from '../AutoGenerationOptions';

// Mock hooks
const mockUpdateFields = vi.fn();
const mockFormData = {
  allowAutoGenerateCharacters: false,
  allowAutoGenerateMainCharacters: false,
};

const mockUseConversationSettingsForm = vi.fn(() => ({
  formData: mockFormData,
  updateFields: mockUpdateFields,
}));

vi.mock('@/hooks/useConversationSettingsForm', () => ({
  useConversationSettingsForm: () => mockUseConversationSettingsForm(),
}));

vi.mock('@/i18n/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe('AutoGenerationOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFormData.allowAutoGenerateCharacters = false;
    mockFormData.allowAutoGenerateMainCharacters = false;
  });

  it('should render the main checkbox', () => {
    renderWithProviders(<AutoGenerationOptions />);

    const checkbox = screen.getByRole('checkbox', {
      name: /conversationSettingsForm.allowAutoGenerateCharacters/i,
    });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('should not render the main characters checkbox when allowAutoGenerateCharacters is false', () => {
    renderWithProviders(<AutoGenerationOptions />);

    const mainCharactersCheckbox = screen.queryByRole('checkbox', {
      name: /conversationSettingsForm.allowAutoGenerateMainCharacters/i,
    });
    expect(mainCharactersCheckbox).not.toBeInTheDocument();
  });

  it('should render the main characters checkbox when allowAutoGenerateCharacters is true', () => {
    mockFormData.allowAutoGenerateCharacters = true;

    renderWithProviders(<AutoGenerationOptions />);

    const mainCharactersCheckbox = screen.getByRole('checkbox', {
      name: /conversationSettingsForm.allowAutoGenerateMainCharacters/i,
    });
    expect(mainCharactersCheckbox).toBeInTheDocument();
    expect(mainCharactersCheckbox).not.toBeChecked();
  });

  it('should call updateFields when main checkbox is checked', () => {
    renderWithProviders(<AutoGenerationOptions />);

    const checkbox = screen.getByRole('checkbox', {
      name: /conversationSettingsForm.allowAutoGenerateCharacters/i,
    });
    fireEvent.click(checkbox);

    expect(mockUpdateFields).toHaveBeenCalledWith({
      allowAutoGenerateCharacters: true,
      allowAutoGenerateMainCharacters: false,
    });
  });

  it('should disable main characters checkbox when main checkbox is unchecked', () => {
    mockFormData.allowAutoGenerateCharacters = true;

    renderWithProviders(<AutoGenerationOptions />);

    const mainCharactersCheckbox = screen.getByRole('checkbox', {
      name: /conversationSettingsForm.allowAutoGenerateMainCharacters/i,
    });
    expect(mainCharactersCheckbox).not.toBeDisabled();
  });

  it('should preserve main characters value when enabling main checkbox', () => {
    mockFormData.allowAutoGenerateCharacters = false;
    mockFormData.allowAutoGenerateMainCharacters = true;

    renderWithProviders(<AutoGenerationOptions />);

    const checkbox = screen.getByRole('checkbox', {
      name: /conversationSettingsForm.allowAutoGenerateCharacters/i,
    });
    fireEvent.click(checkbox);

    expect(mockUpdateFields).toHaveBeenCalledWith({
      allowAutoGenerateCharacters: true,
      allowAutoGenerateMainCharacters: true,
    });
  });

  it('should set allowAutoGenerateMainCharacters to false when main checkbox is unchecked', () => {
    mockFormData.allowAutoGenerateCharacters = true;
    mockFormData.allowAutoGenerateMainCharacters = true;

    renderWithProviders(<AutoGenerationOptions />);

    const checkbox = screen.getByRole('checkbox', {
      name: /conversationSettingsForm.allowAutoGenerateCharacters/i,
    });
    fireEvent.click(checkbox);

    expect(mockUpdateFields).toHaveBeenCalledWith({
      allowAutoGenerateCharacters: false,
      allowAutoGenerateMainCharacters: false,
    });
  });

  it('should call updateFields when main characters checkbox is toggled', () => {
    mockFormData.allowAutoGenerateCharacters = true;

    renderWithProviders(<AutoGenerationOptions />);

    const mainCharactersCheckbox = screen.getByRole('checkbox', {
      name: /conversationSettingsForm.allowAutoGenerateMainCharacters/i,
    });
    fireEvent.click(mainCharactersCheckbox);

    expect(mockUpdateFields).toHaveBeenCalledWith({
      allowAutoGenerateMainCharacters: true,
    });
  });

  it('should display tooltips', () => {
    renderWithProviders(<AutoGenerationOptions />);

    expect(
      screen.getByText(
        'conversationSettingsForm.allowAutoGenerateCharactersTooltip'
      )
    ).toBeInTheDocument();
  });

  it('should display main characters tooltip when visible', () => {
    mockFormData.allowAutoGenerateCharacters = true;

    renderWithProviders(<AutoGenerationOptions />);

    expect(
      screen.getByText(
        'conversationSettingsForm.allowAutoGenerateMainCharactersTooltip'
      )
    ).toBeInTheDocument();
  });
});

