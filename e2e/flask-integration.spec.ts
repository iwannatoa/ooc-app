import { expect, test } from '@playwright/test';

/** Must match default FLASK_E2E_PORT in playwright.flask.config.ts */
const FLASK_INTEGRATION_PORT = '18765';

test.describe('Flask integration (no API mock)', () => {
  test('health endpoint reachable from browser context', async ({ page }) => {
    const flaskBase = (
      process.env.FLASK_E2E_URL ||
      `http://127.0.0.1:${process.env.FLASK_E2E_PORT || FLASK_INTEGRATION_PORT}`
    ).replace(/\/$/, '');
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();

    const ok = await page.evaluate(async (base) => {
      const res = await fetch(`${base}/api/health`);
      return res.ok;
    }, flaskBase);

    expect(ok).toBe(true);
  });
});
