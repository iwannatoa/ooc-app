import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { DataSettings } from '../DataSettings';

const mockInvoke = vi.fn();
const mockOpen = vi.fn();
const mockSave = vi.fn();
const mockCheck = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: (...args: unknown[]) => mockOpen(...args),
  save: (...args: unknown[]) => mockSave(...args),
}));

vi.mock('@tauri-apps/plugin-updater', () => ({
  check: (...args: unknown[]) => mockCheck(...args),
}));

vi.mock('@/i18n/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe('DataSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error test-only runtime flag
    delete window.__TAURI_INTERNALS__;
  });

  it('shows desktop-only hint when not running in tauri', async () => {
    renderWithProviders(<DataSettings />);
    fireEvent.click(screen.getByText('settingsPanel.dataCheckUpdate'));

    await waitFor(() => {
      expect(screen.getByText('settingsPanel.dataDesktopOnly')).toBeInTheDocument();
    });
  });

  it('checks and installs update when available', async () => {
    // @ts-expect-error test-only runtime flag
    window.__TAURI_INTERNALS__ = {};
    const downloadAndInstall = vi.fn().mockResolvedValue(undefined);
    mockCheck.mockResolvedValue({
      version: '0.3.0',
      body: '## Changelog',
      downloadAndInstall,
    });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithProviders(<DataSettings />);
    fireEvent.click(screen.getByText('settingsPanel.dataCheckUpdate'));

    await waitFor(() => {
      expect(mockCheck).toHaveBeenCalledTimes(1);
      expect(downloadAndInstall).toHaveBeenCalledTimes(1);
      expect(
        screen.getByText('settingsPanel.dataUpdaterInstalled')
      ).toBeInTheDocument();
      expect(screen.getByText('## Changelog')).toBeInTheDocument();
    });

    confirmSpy.mockRestore();
  });

  it('exports diagnostics with profile fingerprint', async () => {
    // @ts-expect-error test-only runtime flag
    window.__TAURI_INTERNALS__ = {};
    mockSave.mockResolvedValue('C:/tmp/ooc-diagnostics.zip');
    mockInvoke.mockResolvedValue('ok');

    renderWithProviders(<DataSettings />, {
      initialState: {
        settings: {
          settings: {
            activeProfileId: 'profile-a',
          },
        },
      },
    });
    fireEvent.click(screen.getByText('settingsPanel.dataExportDiagnostics'));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        'export_diagnostic_bundle',
        expect.objectContaining({
          zipPath: 'C:/tmp/ooc-diagnostics.zip',
          profileFingerprint: expect.any(String),
        })
      );
    });
  });
});
