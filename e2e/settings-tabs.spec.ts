import { expect, test } from '@playwright/test';
import type { MockApiState } from './helpers/mockStoryApi';
import { installMockStoryApi } from './helpers/mockStoryApi';
import { gotoApp, installE2eTauriHooks, openSettings } from './helpers/storyFlow';

test.describe('Settings tabs minimal save', () => {
  let mockApi: MockApiState;

  test.beforeEach(async ({ page }) => {
    mockApi = await installMockStoryApi(page);
    await installE2eTauriHooks(page);
  });

  test('General / AI / Appearance / Advanced changes persist in mocked app-settings', async ({
    page,
  }) => {
    await gotoApp(page);
    await openSettings(page);

    const panel = page.locator('[class*="settingsPanelOverlay"]');
    await expect(panel).toBeVisible();
    const content = panel.locator('[class*="settingsContent"]');

    await page.getByRole('button', { name: /AI Settings|AI 设置/i }).click();
    await content.locator('select').first().selectOption('deepseek');

    await page.getByRole('button', { name: /Appearance|外观/i }).click();
    await content.locator('select').first().selectOption('light');

    await page.getByRole('button', { name: /Advanced|高级/i }).click();
    await page
      .getByRole('checkbox', {
        name: /Enable Streaming Response|启用流式响应/i,
      })
      .check();

    await page.getByRole('button', { name: /General|通用/i }).click();
    await content.locator('select').first().selectOption('ja');
    await expect(content.locator('select').first()).toHaveValue('ja');

    const settingsPost = page.waitForRequest((r) => {
      const u = r.url();
      if (
        !u.includes('/api/app-settings') ||
        u.includes('/api/app-settings/language')
      ) {
        return false;
      }
      if (r.method() !== 'POST') return false;
      try {
        const body = r.postDataJSON() as { settings?: string };
        return typeof body.settings === 'string';
      } catch {
        return false;
      }
    });

    await page.getByRole('button', { name: /^save$|^保存$/i }).click();
    const postReq = await settingsPost;
    const posted = JSON.parse(
      (postReq.postDataJSON() as { settings: string }).settings
    ) as {
      general: { language: string };
      ai: { provider: string };
      appearance: { theme: string };
      advanced: { enableStreaming: boolean };
    };

    expect(posted.general.language).toBe('ja');
    expect(posted.ai.provider).toBe('deepseek');
    expect(posted.appearance.theme).toBe('light');
    expect(posted.advanced.enableStreaming).toBe(true);

    await expect(async () => {
      const cur = JSON.parse(mockApi.getAppSettingsJson()) as typeof posted;
      expect(cur.general.language).toBe('ja');
      expect(cur.ai.provider).toBe('deepseek');
      expect(cur.appearance.theme).toBe('light');
      expect(cur.advanced.enableStreaming).toBe(true);
    }).toPass({ timeout: 5_000 });
  });
});
