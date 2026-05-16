/**
 * Optional hooks for Playwright E2E: when `window.__OOC_E2E__` is injected via
 * `page.addInitScript`, PDF/project-bundle flows bypass native Tauri plugins.
 * Production/desktop builds leave `__OOC_E2E__` unset → delegates unchanged.
 */
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';

export type TauriSaveOptions = Parameters<typeof save>[0];

declare global {
  interface Window {
    __OOC_E2E__?: {
      pickSavePath?: (options: TauriSaveOptions) => Promise<string | null>;
      writeBinary?: (path: string, data: Uint8Array) => Promise<void>;
      writeText?: (path: string, text: string) => Promise<void>;
    };
  }
}

type OocE2eHooks = NonNullable<Window['__OOC_E2E__']>;

function getOocE2eHooks(): OocE2eHooks | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.__OOC_E2E__;
}

export async function e2ePickSavePath(
  options: TauriSaveOptions
): Promise<string | null> {
  const hook = getOocE2eHooks()?.pickSavePath;
  if (hook) {
    return hook(options);
  }
  return save(options);
}

export async function e2eWriteBinary(
  path: string,
  data: Uint8Array
): Promise<void> {
  const hook = getOocE2eHooks()?.writeBinary;
  if (hook) {
    await hook(path, data);
    return;
  }
  await writeFile(path, data);
}

export async function e2eWriteText(path: string, text: string): Promise<void> {
  const hook = getOocE2eHooks()?.writeText;
  if (hook) {
    await hook(path, text);
    return;
  }
  await writeTextFile(path, text);
}
