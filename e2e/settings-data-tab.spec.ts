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
  await expect(
    page.getByRole('button', {
      name: /export encrypted backup|导出加密备份包/i,
    })
  ).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: /restore encrypted backup|恢复加密备份包/i,
    })
  ).toBeVisible();
  while (
    (await page.getByRole('button', { name: 'Dismiss notification' }).count()) >
    0
  ) {
    await page.getByRole('button', { name: 'Dismiss notification' }).first().click();
  }
  await expectNoSeriousOrCriticalViolations(page);
});
