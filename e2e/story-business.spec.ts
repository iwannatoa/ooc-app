import { expect, test } from '@playwright/test';
import { installMockStoryApi } from './helpers/mockStoryApi';
import { expectNoSeriousOrCriticalViolations } from './axe-helpers';
import {
  clickNewStory,
  closeSettingsPanel,
  deleteFirstConversation,
  openSettings,
  saveStorySettings,
  sendChatMessage,
} from './helpers/storyFlow';

test('story creation and first message roundtrip works end-to-end', async ({
  page,
}) => {
  await installMockStoryApi(page);
  await page.goto('/');
  await expect(page.locator('#root')).toBeVisible();

  await clickNewStory(page);
  await saveStorySettings(page, {
    background: 'A broken moon hangs over a silent city.',
    outline: 'Arrival, conflict, and a final revelation.',
  });

  await sendChatMessage(page, 'Write the opening scene in the rain.');
  await expect(page.getByText(/Turn 1:/)).toBeVisible();
  await expect(page.locator('[class*="conversationList"] [role="button"]')).toHaveCount(1);
});

test('multi-turn story writing keeps continuity and persists after reload', async ({
  page,
}) => {
  await installMockStoryApi(page);
  await page.goto('/');
  await expect(page.locator('#root')).toBeVisible();

  await clickNewStory(page);
  await saveStorySettings(page, {
    background: 'A drifting fortress above frozen seas.',
  });

  await sendChatMessage(page, 'Introduce the hero and the mission.');
  await sendChatMessage(page, 'Add a twist involving a hidden map.');
  await sendChatMessage(page, 'Finish this part with a cliffhanger.');

  await expect(page.getByText(/Turn 3:/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Continuing from/).first()).toBeVisible();

  await page.reload();
  await expect(page.locator('#root')).toBeVisible();
  await page.locator('[class*="conversationList"] [role="button"]').first().click();
  await expect(page.getByText(/Turn 3:/)).toBeVisible();
});

test('conversation select rename and delete flow works', async ({ page }) => {
  await installMockStoryApi(page);
  await page.goto('/');
  await expect(page.locator('#root')).toBeVisible();

  await clickNewStory(page);
  await saveStorySettings(page, {
    background: 'Alpha background',
  });
  await sendChatMessage(page, 'Alpha opening');
  await expect(page.getByText(/Turn 1:/)).toBeVisible({ timeout: 15_000 });

  await clickNewStory(page);
  await saveStorySettings(page, {
    background: 'Beta background',
  });
  await sendChatMessage(page, 'Beta opening');
  await expect(page.getByText(/Turn 1:/)).toBeVisible();

  await page.locator('[class*="conversationList"] [role="button"]').nth(1).click();
  await expect(page.locator('[class*="conversationList"] [role="button"]')).toHaveCount(2);

  await page.getByRole('button', { name: /edit|编辑/i }).last().click();
  await expect(page.locator('#title')).toBeVisible();
  await page.locator('#title').fill('Renamed Story');
  await page.locator('form button[type="submit"]').click();
  await expect(page.locator('[class*="conversationList"] [role="button"]')).toHaveCount(2);

  await deleteFirstConversation(page);
  await expect(page.locator('[class*="conversationList"] [role="button"]')).toHaveCount(1);
});

test('provider switch keeps message sending available', async ({ page }) => {
  const mockApi = await installMockStoryApi(page);
  await page.goto('/');
  await expect(page.locator('#root')).toBeVisible();

  await openSettings(page);
  await page.getByRole('button', { name: /ai|模型|智能/i }).first().click();
  const providerSelect = page
    .locator('select:has(option[value="openai"])')
    .first();
  await expect(providerSelect).toBeVisible();
  await providerSelect.selectOption('openai');
  await expect(providerSelect).toHaveValue('openai');
  await providerSelect.selectOption('ollama');
  await expect(providerSelect).toHaveValue('ollama');
  await closeSettingsPanel(page);

  await clickNewStory(page);
  await saveStorySettings(page, {
    background: 'Cross-provider runtime verification background',
  });
  await sendChatMessage(page, 'Continue after provider switching.');
  await expect(page.getByText(/Turn 1:/)).toBeVisible();
  expect(mockApi.counters.models).toBeLessThanOrEqual(3);
});

test('health and message loading requests remain bounded', async ({ page }) => {
  const mockApi = await installMockStoryApi(page);
  await page.goto('/');
  await expect(page.locator('#root')).toBeVisible();
  await page.waitForTimeout(2500);

  await clickNewStory(page);
  await saveStorySettings(page, {
    background: 'Bounded counters background',
  });
  await sendChatMessage(page, 'First bounded message');
  await sendChatMessage(page, 'Second bounded message');
  await expect(page.getByText(/Turn 2:/)).toBeVisible({ timeout: 15_000 });

  expect(mockApi.counters.healthChecks).toBeLessThanOrEqual(8);
  expect(mockApi.counters.conversationMessages).toBeLessThanOrEqual(6);
});

test('chat supports attachment send and render card', async ({ page }) => {
  await installMockStoryApi(page);
  await page.goto('/');
  await expect(page.locator('#root')).toBeVisible();

  await clickNewStory(page);
  await saveStorySettings(page, {
    background: 'Attachment flow validation background',
  });

  const fileInput = page.locator('input[aria-label="chat-attachments"]');
  await fileInput.setInputFiles({
    name: 'evidence.png',
    mimeType: 'image/png',
    buffer: Buffer.from('fake-image-content'),
  });
  await expect(page.getByLabel('attachment-selection')).toContainText('evidence.png');

  await sendChatMessage(page, 'Message with attachment');
  await expect(page.getByText(/Turn 1:/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('evidence.png')).toBeVisible();
});

test('chat controls have no serious axe violations', async ({ page }) => {
  await installMockStoryApi(page);
  await page.goto('/');
  await expect(page.locator('#root')).toBeVisible();

  await clickNewStory(page);
  await saveStorySettings(page, {
    background: 'Accessibility checks for chat controls',
  });
  await sendChatMessage(page, 'Generate one turn for a11y checks.');
  await expect(page.getByText(/Turn 1:/)).toBeVisible({ timeout: 15_000 });

  await expectNoSeriousOrCriticalViolations(page);
});

test('branch rollback controls can open variant diff panel', async ({ page }) => {
  await installMockStoryApi(page);
  await page.goto('/');
  await expect(page.locator('#root')).toBeVisible();

  await clickNewStory(page);
  await saveStorySettings(page, {
    background: 'Branch and rollback control checks',
  });
  await sendChatMessage(page, 'Generate variant baseline.');
  await expect(page.getByText(/Turn 1:/)).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: 'Rollback' }).click();
  await expect(page.getByText('Variant Diff')).toBeVisible();
  await page
    .getByRole('dialog', { name: 'variant-diff-panel' })
    .getByRole('button', { name: 'Close' })
    .click();
  await expect(page.getByText('Variant Diff')).not.toBeVisible();
});

