import { test, expect } from '@playwright/test';
import { expectNoSeriousOrCriticalViolations } from './axe-helpers';

test('settings panel shows data tab and no serious axe violations', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#root')).toBeVisible();
  await page.getByRole('button', { name: /settings|设置/i }).first().click();
  await expect(
    page.getByRole('button', { name: /data & backup|数据与备份/i })
  ).toBeVisible();
  await page
    .getByRole('button', { name: /data & backup|数据与备份/i })
    .click();
  await expect(
    page.getByText(/diagnostic zip|诊断 zip|desktop app|桌面版/i).first()
  ).toBeVisible();
  await expectNoSeriousOrCriticalViolations(page);
});
