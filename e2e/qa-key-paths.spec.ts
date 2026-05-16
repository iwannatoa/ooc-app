import { expect, test, type Page } from '@playwright/test';
import { installMockStoryApi } from './helpers/mockStoryApi';

/** Injected before navigation so PDF / Bundle flows work without native Tauri in vite preview. */
const installE2eTauriHooks = async (page: Page) => {
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
 * Use string evaluate so hook implementations match `addInitScript` serialization.
 */
const primeOocE2eHooks = (page: Page) =>
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

const gotoApp = async (page: Page, path = '/') => {
  await page.goto(path);
  await primeOocE2eHooks(page);
};

const clickNewStory = async (page: Page) => {
  await page.getByRole('button', { name: /new story|新建故事|new/i }).first().click();
  await expect(page.locator('#title')).toBeVisible();
};

const saveStorySettings = async (
  page: Page,
  { background, outline }: { background: string; outline?: string }
) => {
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

const sendChatMessage = async (page: Page, text: string) => {
  const input = page.locator('input[aria-label]').first();
  await expect(input).toBeVisible();
  await input.fill(text);
  await input.press('Enter');
};

test.describe('REQ-QA-002 key paths', () => {
  test.beforeEach(async ({ page }) => {
    await installMockStoryApi(page);
    await installE2eTauriHooks(page);
  });

  test('multi-profile save persists across reload', async ({ page }) => {
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept('Beta');
    });

    await gotoApp(page);
    await expect(page.locator('#root')).toBeVisible();

    await page.getByRole('button', { name: /settings|设置/i }).first().click();
    await page.getByRole('button', { name: '+Profile' }).click();

    const profileSelect = page.getByRole('combobox', {
      name: /active profile|当前配置文件|Active profile/i,
    });
    await expect(profileSelect).toBeVisible();
    await expect(profileSelect.locator('option')).toHaveCount(2);

    await profileSelect.selectOption({ label: 'Default' });

    await page.getByRole('button', { name: /^save$|^保存$/i }).click();

    await page.reload();
    await expect(page.locator('#root')).toBeVisible();
    await primeOocE2eHooks(page);

    const raw = await page.evaluate(async () => {
      const res = await fetch('/api/app-settings');
      const data = (await res.json()) as { settings: string };
      return data.settings;
    });
    const parsed = JSON.parse(raw) as {
      profiles?: Array<{ id: string; name: string }>;
      activeProfileId?: string;
    };
    expect(parsed.profiles?.length).toBe(2);
    expect(parsed.activeProfileId).toBe('default');
    expect(parsed.profiles?.map((p) => p.name)).toEqual(
      expect.arrayContaining(['Default', 'Beta'])
    );
  });

  test('export PDF hits API and writes binary via E2E hooks', async ({ page }) => {
    await gotoApp(page);
    await expect(page.locator('#root')).toBeVisible();

    await clickNewStory(page);
    await saveStorySettings(page, { background: 'PDF export QA path' });
    await sendChatMessage(page, 'Open with tension.');
    await expect(page.getByText(/Turn 1:/)).toBeVisible({ timeout: 15_000 });

    const pdfResp = page.waitForResponse(
      (res) =>
        res.url().includes('/api/export/pdf') &&
        res.request().method() === 'POST' &&
        res.ok()
    );
    await page.getByRole('button', { name: 'PDF' }).click();
    await pdfResp;

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            return (
              window as unknown as {
                __OOC_E2E_LAST_WRITE__?: {
                  path: string;
                  kind: string;
                  byteLength?: number;
                };
              }
            ).__OOC_E2E_LAST_WRITE__;
          }),
        { timeout: 15_000 }
      )
      .toMatchObject({
        path: '/tmp/ooc-e2e-export.pdf',
        kind: 'binary',
        byteLength: 3,
      });
  });

  test('export project bundle hits API and writes JSON via E2E hooks', async ({
    page,
  }) => {
    await gotoApp(page);
    await expect(page.locator('#root')).toBeVisible();

    await clickNewStory(page);
    await saveStorySettings(page, { background: 'Bundle export QA path' });
    await sendChatMessage(page, 'Establish continuity.');
    await expect(page.getByText(/Turn 1:/)).toBeVisible({ timeout: 15_000 });

    const bundleResp = page.waitForResponse(
      (res) =>
        res.url().includes('/api/export/project-bundle') &&
        res.request().method() === 'POST' &&
        res.ok()
    );
    await page.getByRole('button', { name: 'Bundle' }).click();
    await bundleResp;

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            return (
              window as unknown as {
                __OOC_E2E_LAST_WRITE__?: {
                  path: string;
                  kind: string;
                  textLength?: number;
                };
              }
            ).__OOC_E2E_LAST_WRITE__;
          }),
        { timeout: 15_000 }
      )
      .toMatchObject({
        path: '/tmp/ooc-e2e-bundle.json',
        kind: 'text',
      });

    const lastWrite = await page.evaluate(() => {
      return (
        window as unknown as {
          __OOC_E2E_LAST_WRITE__?: {
            textLength?: number;
          };
        }
      ).__OOC_E2E_LAST_WRITE__;
    });
    expect((lastWrite?.textLength ?? 0) > 50).toBe(true);
  });

  test('savepoint create restore then continue messaging', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      if (dialog.type() !== 'prompt') {
        await dialog.dismiss();
        return;
      }
      const msg = dialog.message();
      if (msg.includes('Savepoint label')) {
        await dialog.accept('e2e-checkpoint');
      } else if (msg.includes('savepoint id')) {
        await dialog.accept('sp-1');
      } else {
        await dialog.dismiss();
      }
    });

    await gotoApp(page);
    await expect(page.locator('#root')).toBeVisible();

    await clickNewStory(page);
    await saveStorySettings(page, { background: 'Savepoint QA narrative path' });
    await sendChatMessage(page, 'First beat.');
    await expect(page.getByText(/Turn 1:/)).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Savepoint' }).click();
    await page.locator('button[title="Restore from savepoint"]').click();

    await sendChatMessage(page, 'Second beat after restore.');
    await expect(
      page.getByText('Second beat after restore.', { exact: true })
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Turn 2:/)).toBeVisible({ timeout: 15_000 });
  });

  test('encrypted backup entry shows desktop-only hint on web preview', async ({
    page,
  }) => {
    await gotoApp(page);
    await expect(page.locator('#root')).toBeVisible();

    await page.getByRole('button', { name: /settings|设置/i }).first().click();
    await page
      .getByRole('button', { name: /data & backup|数据与备份/i })
      .click();

    await page
      .getByRole('button', {
        name: /export encrypted backup|导出加密备份包/i,
      })
      .click();

    await expect(
      page.getByText(/desktop app|Tauri|桌面版/i).first()
    ).toBeVisible();
  });
});
