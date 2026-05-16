import { test, expect } from '@playwright/test';

test('story workspace basic flow is accessible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#root')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /new story|新建故事|new/i }).first()
  ).toBeVisible();
});

test('ai provider options can be switched in settings', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /settings|设置/i }).first().click();
  await page.getByRole('button', { name: /ai|模型|智能/i }).first().click();

  const providerSelect = page.locator('select:not([disabled])').first();
  await expect(providerSelect).toBeVisible();
  await providerSelect.selectOption('openai');
  await expect(providerSelect).toHaveValue('openai');
  await providerSelect.selectOption('azure');
  await expect(providerSelect).toHaveValue('azure');
});

test('ui remains stable during offline and reconnect toggles', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#root')).toBeVisible();

  await page.context().setOffline(true);
  await expect(page.locator('#root')).toBeVisible();

  await page.context().setOffline(false);
  await expect(page.locator('#root')).toBeVisible();
});

test('conversation list request remains bounded on startup', async ({ page }) => {
  let listGetRequestCount = 0;
  page.on('request', (request) => {
    if (
      request.method() === 'GET' &&
      request.url().includes('/api/conversations/list')
    ) {
      listGetRequestCount += 1;
    }
  });

  await page.goto('/');
  await expect(page.locator('#root')).toBeVisible();
  await page.waitForTimeout(2500);

  expect(listGetRequestCount).toBeLessThanOrEqual(2);
});

test('models request remains bounded after switching to ollama', async ({ page }) => {
  let modelsGetRequestCount = 0;
  page.on('request', (request) => {
    if (
      request.method() === 'GET' &&
      request.url().includes('/api/models?provider=ollama')
    ) {
      modelsGetRequestCount += 1;
    }
  });

  await page.goto('/');
  await expect(page.locator('#root')).toBeVisible();

  await page.getByRole('button', { name: /settings|设置/i }).first().click();
  await page.getByRole('button', { name: /ai|模型|智能/i }).first().click();

  const providerSelect = page.locator('select:not([disabled])').first();
  await expect(providerSelect).toBeVisible();
  await providerSelect.selectOption('ollama');
  await expect(providerSelect).toHaveValue('ollama');

  modelsGetRequestCount = 0;
  await page.waitForTimeout(3500);

  expect(modelsGetRequestCount).toBeLessThanOrEqual(2);
});
