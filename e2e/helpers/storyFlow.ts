import { expect, type Page } from '@playwright/test';

/** Injected before navigation so PDF / Bundle flows work without native Tauri in vite preview. */
export const installE2eTauriHooks = async (page: Page): Promise<void> => {
  await page.addInitScript(`
    (function () {
      window.__OOC_E2E_LAST_WRITE__ = undefined;
      var hooks = {
        pickSavePath: async function (opts) {
          var dp = opts && opts.defaultPath ? String(opts.defaultPath) : '';
          if (dp.endsWith('.pdf')) return '/tmp/ooc-e2e-export.pdf';
          if (dp.endsWith('.json')) return '/tmp/ooc-e2e-bundle.json';
          return '/tmp/ooc-e2e-generic.bin';
        },
        writeBinary: async function (path, data) {
          window.__OOC_E2E_LAST_WRITE__ = {
            path: path,
            kind: 'binary',
            byteLength: data.byteLength,
          };
        },
        writeText: async function (path, text) {
          window.__OOC_E2E_LAST_WRITE__ = {
            path: path,
            kind: 'text',
            textLength: text.length,
          };
        },
      };
      window.__OOC_E2E__ = hooks;
      globalThis.__OOC_E2E__ = hooks;
    })();
  `);
};

/**
 * Re-apply hooks after navigation: ensures `globalThis.__OOC_E2E__` is present at click-time.
 */
export const primeOocE2eHooks = (page: Page): Promise<unknown> =>
  page.evaluate(`
    (function () {
      window.__OOC_E2E_LAST_WRITE__ = undefined;
      var hooks = {
        pickSavePath: async function (opts) {
          var dp = opts && opts.defaultPath ? String(opts.defaultPath) : '';
          if (dp.endsWith('.pdf')) return '/tmp/ooc-e2e-export.pdf';
          if (dp.endsWith('.json')) return '/tmp/ooc-e2e-bundle.json';
          return '/tmp/ooc-e2e-generic.bin';
        },
        writeBinary: async function (path, data) {
          window.__OOC_E2E_LAST_WRITE__ = {
            path: path,
            kind: 'binary',
            byteLength: data.byteLength,
          };
        },
        writeText: async function (path, text) {
          window.__OOC_E2E_LAST_WRITE__ = {
            path: path,
            kind: 'text',
            textLength: text.length,
          };
        },
      };
      window.__OOC_E2E__ = hooks;
      globalThis.__OOC_E2E__ = hooks;
    })();
  `);

export const gotoApp = async (page: Page, path = '/'): Promise<void> => {
  await page.goto(path);
  await primeOocE2eHooks(page);
};

export const clickNewStory = async (page: Page): Promise<void> => {
  await page
    .getByRole('button', { name: /new story|新建故事|new/i })
    .first()
    .click();
  await expect(page.locator('#title')).toBeVisible();
};

export const saveStorySettings = async (
  page: Page,
  { background, outline }: { background: string; outline?: string }
): Promise<void> => {
  await page.locator('#title').fill(`Story ${Date.now()}`);
  await page.locator('#background').fill(background);
  await page.locator('#outline').fill(
    outline || 'Default outline for deterministic E2E flow.'
  );
  await page.locator('form button[type="submit"]').click();
  await page.locator('[class*="conversationList"] [role="button"]').first().click();
  await expect(page.locator('input[aria-label]').first()).toBeVisible({
    timeout: 15_000,
  });
};

export const sendChatMessage = async (
  page: Page,
  text: string
): Promise<void> => {
  const input = page.locator('input[aria-label]').first();
  await expect(input).toBeVisible();
  await input.fill(text);
  await input.press('Enter');
};

export const deleteFirstConversation = async (page: Page): Promise<void> => {
  const itemContainer = page
    .locator('[class*="conversationList"] [class*="item"]')
    .first();
  await itemContainer.locator('button:has-text("×")').click();
  await page.getByRole('button', { name: /confirm|确认/i }).first().click();
};

export const openSettings = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: /settings|设置/i }).first().click();
};

export const closeSettingsPanel = async (page: Page): Promise<void> => {
  await page
    .locator('[class*="settingsPanelOverlay"] button:has-text("×")')
    .first()
    .click();
};
