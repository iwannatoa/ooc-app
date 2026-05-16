import { expect, test } from '@playwright/test';
import { installMockStoryApi } from './helpers/mockStoryApi';
import {
  clickNewStory,
  gotoApp,
  installE2eTauriHooks,
  saveStorySettings,
  sendChatMessage,
} from './helpers/storyFlow';

test.describe('Summary prompt flow', () => {
  test.beforeEach(async ({ page }) => {
    await installMockStoryApi(page);
    await installE2eTauriHooks(page);
  });

  test('chat-stream meta opens dialog; generate, save, GET summary reflects data', async ({
    page,
  }) => {
    await gotoApp(page);
    await clickNewStory(page);
    await saveStorySettings(page, {
      background: 'Summary E2E world.',
      outline: 'One beat, one turn, one summary.',
    });

    await sendChatMessage(page, 'Warmup beat.');
    await expect(page.getByText(/Turn 1:/)).toBeVisible({ timeout: 15_000 });

    await sendChatMessage(page, '__E2E_TRIGGER_SUMMARY__');

    await expect(
      page.getByRole('heading', {
        name: /Story Summary|故事总结/i,
      })
    ).toBeVisible({ timeout: 15_000 });

    await page
      .getByRole('button', {
        name: /AI Generate Summary|AI 生成总结/i,
      })
      .click();

    const summaryBox = page.locator('#summary');
    await expect(summaryBox).not.toHaveValue('', { timeout: 15_000 });
    const summaryText = await summaryBox.inputValue();
    expect(summaryText.length).toBeGreaterThan(4);

    await page
      .getByRole('button', { name: /Confirm Save|确认保存/i })
      .click();

    await expect(
      page.getByRole('heading', { name: /Story Summary|故事总结/i })
    ).toHaveCount(0);

    const persisted = await page.evaluate(async () => {
      const listRes = await fetch('/api/conversations/list');
      const listJson = (await listRes.json()) as {
        conversations: Array<{ conversation_id: string }>;
      };
      const id = listJson.conversations[0]?.conversation_id;
      if (!id) return null;
      const sumRes = await fetch(
        `/api/conversation/summary?conversation_id=${encodeURIComponent(id)}`
      );
      if (!sumRes.ok) return null;
      const sumJson = (await sumRes.json()) as {
        summary: { summary: string };
      };
      return sumJson.summary?.summary ?? null;
    });

    const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
    expect(norm(persisted ?? '')).toBe(norm(summaryText));
  });
});
