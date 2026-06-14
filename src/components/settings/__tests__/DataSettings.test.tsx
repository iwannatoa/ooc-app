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
    mockInvoke.mockResolvedValue({ success: true, data: 'C:/profiles/default' });
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
    mockInvoke.mockImplementation((command: string) => {
      if (command === 'get_profile_data_root') {
        return Promise.resolve({ success: true, data: 'C:/profiles/profile-a' });
      }
      return Promise.resolve('ok');
    });

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
        'get_profile_data_root',
        expect.objectContaining({
          profileId: 'profile-a',
        })
      );
      const exportCall = mockInvoke.mock.calls.find(
        (call) => call[0] === 'export_diagnostic_bundle'
      );
      expect(exportCall).toBeTruthy();
      expect(exportCall?.[1]).toEqual(
        expect.objectContaining({
          zipPath: 'C:/tmp/ooc-diagnostics.zip',
          profileId: 'profile-a',
          profileFingerprint: expect.any(String),
        })
      );
    });
  });

  it('exports encrypted backup with password confirmation', async () => {
    // @ts-expect-error test-only runtime flag
    window.__TAURI_INTERNALS__ = {};
    mockSave.mockResolvedValue('C:/tmp/ooc-encrypted-backup.zip');
    const promptSpy = vi
      .spyOn(window, 'prompt')
      .mockReturnValueOnce('secret-password')
      .mockReturnValueOnce('secret-password');
    mockInvoke.mockResolvedValue({ success: true, data: 'ok' });

    renderWithProviders(<DataSettings />, {
      initialState: {
        settings: {
          settings: {
            activeProfileId: 'profile-a',
            profiles: [{ id: 'profile-a', name: 'Profile A' }],
          },
        },
      },
    });

    fireEvent.click(screen.getByText('settingsPanel.dataEncryptedExport'));

    await waitFor(() => {
      const call = mockInvoke.mock.calls.find(
        (item) => item[0] === 'export_encrypted_backup_bundle'
      );
      expect(call).toBeTruthy();
      expect(call?.[1]).toEqual(
        expect.objectContaining({
          destPath: 'C:/tmp/ooc-encrypted-backup.zip',
          profileId: 'profile-a',
          password: 'secret-password',
        })
      );
      expect(
        screen.getByText('settingsPanel.dataEncryptedExportDone')
      ).toBeInTheDocument();
    });

    promptSpy.mockRestore();
  });

  it('shows mapped error for encrypted restore failure', async () => {
    // @ts-expect-error test-only runtime flag
    window.__TAURI_INTERNALS__ = {};
    mockOpen.mockResolvedValue('C:/tmp/ooc-encrypted-backup.zip');
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('wrong');
    mockInvoke.mockResolvedValue({
      success: false,
      error: 'BACKUP_ERR_INVALID_PASSWORD',
    });

    renderWithProviders(<DataSettings />);
    fireEvent.click(screen.getByText('settingsPanel.dataEncryptedRestore'));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        'restore_encrypted_backup_bundle',
        expect.objectContaining({
          srcPath: 'C:/tmp/ooc-encrypted-backup.zip',
          password: 'wrong',
        })
      );
      expect(
        screen.getByText('settingsPanel.dataEncryptedErrInvalidPassword')
      ).toBeInTheDocument();
    });

    promptSpy.mockRestore();
  });
});
