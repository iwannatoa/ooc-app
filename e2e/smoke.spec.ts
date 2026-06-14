import { test, expect } from '@playwright/test';
import { expectNoSeriousOrCriticalViolations } from './axe-helpers';

test('home page loads and root is mounted', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/OOC story/i);
  await expect(page.locator('#root')).toBeVisible();
  await expectNoSeriousOrCriticalViolations(page);
});
