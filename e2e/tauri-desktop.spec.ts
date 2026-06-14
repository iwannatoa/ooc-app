import { expect, test } from './tauri-fixtures';

test('main window shows app shell', async ({ tauriPage }) => {
  await expect(tauriPage).toHaveTitle(/OOC story/i);
  await expect(tauriPage.locator('#root')).toBeVisible({ timeout: 60_000 });
});
