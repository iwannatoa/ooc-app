import { expect, test } from './tauri-fixtures.mjs';

test('main window shows app shell', async ({ tauriPage }) => {
  await expect(tauriPage).toHaveTitle(/OOC story/i);
  await expect(tauriPage.locator('#root')).toBeVisible({ timeout: 60_000 });
});

test('tauri runtime bridge and flask health chain are available', async ({
  tauriPage,
}) => {
  await expect(tauriPage.locator('#root')).toBeVisible({ timeout: 60_000 });

  const hasTauriRuntime = await tauriPage.evaluate(
    () => Boolean(window.__TAURI__?.core?.invoke)
  );
  test.skip(
    !hasTauriRuntime,
    'Current run uses browser fallback mode without Tauri runtime'
  );

  const healthProbe = await tauriPage.evaluate(async () => {
    const tokenResp = await window.__TAURI__.core.invoke('get_flask_api_token');
    const portResp = await window.__TAURI__.core.invoke('get_flask_port');
    const token = tokenResp?.success ? String(tokenResp.data || '').trim() : '';
    const port = Number(portResp?.data || 0);
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const payload = await response.json().catch(() => ({}));
    return {
      status: response.status,
      ok: response.ok,
      payload,
    };
  });

  expect(healthProbe.ok).toBe(true);
  expect(healthProbe.status).toBe(200);
  expect(healthProbe.payload?.status).toBe('healthy');

  const bridgeResponse = await tauriPage.evaluate(async () => {
    return await window.__TAURI__.core.invoke('frontend_log', {
      level: 'error',
      message: '[E2E] tauri frontend_log bridge check',
    });
  });
  expect(Boolean(bridgeResponse?.success)).toBe(true);
});
