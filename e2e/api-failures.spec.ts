import { expect, test } from '@playwright/test';
import { installMockStoryApi } from './helpers/mockStoryApi';
import {
  clickNewStory,
  gotoApp,
  installE2eTauriHooks,
  saveStorySettings,
} from './helpers/storyFlow';

test.describe('API failure surfaces', () => {
  test('chat-stream 503 ends sending state and succeeds on retry', async ({
    page,
  }) => {
    await installMockStoryApi(page, { failChatStreamOnce: true });
    await installE2eTauriHooks(page);
    await gotoApp(page);

    await clickNewStory(page);
    await saveStorySettings(page, {
      background: 'API failure flow.',
    });

    const chatInput = page.getByRole('textbox', {
      name: /Type your message|输入你的消息/i,
    });

    const failStream = page.waitForResponse(
      (r) =>
        r.url().includes('/api/chat-stream') &&
        r.request().method() === 'POST' &&
        r.status() === 503,
      { timeout: 15_000 }
    );
    await chatInput.fill('First attempt');
    await page.getByRole('button', { name: /^Send$|^发送$/i }).click();
    await failStream;
    await expect(chatInput).toBeEnabled({ timeout: 15_000 });
    await expect(page.getByText(/Turn 1:/)).toHaveCount(0);
    await expect(
      page.getByText(/Sending|发送中|Thinking|思考/i)
    ).toHaveCount(0);

    const okStream = page.waitForResponse(
      (r) =>
        r.url().includes('/api/chat-stream') &&
        r.request().method() === 'POST' &&
        r.status() === 200,
      { timeout: 15_000 }
    );
    await chatInput.fill('Second attempt OK');
    await page.getByRole('button', { name: /^Send$|^发送$/i }).click();
    await okStream;
    await expect(page.getByText(/Turn 1:/)).toBeVisible({ timeout: 15_000 });
    await expect(chatInput).toBeEnabled();
  });
});
