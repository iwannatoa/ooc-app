import { expect, test } from './tauri-fixtures.mjs';

test.describe.configure({ mode: 'serial' });

test('main window shows app shell', async ({ tauriPage }) => {
  await expect(tauriPage).toHaveTitle(/OOC story/i);
  await expect(tauriPage.locator('#root')).toBeVisible({ timeout: 60_000 });
});

test('tauri runtime bridge and flask health chain are available', async ({
  tauriPage,
}) => {
  await expect(tauriPage.locator('#root')).toBeVisible({ timeout: 60_000 });

  const hasTauriRuntime = await tauriPage.evaluate(
    'Boolean(window.__TAURI__?.core?.invoke)'
  );
  test.skip(
    !hasTauriRuntime,
    'Current run uses browser fallback mode without Tauri runtime'
  );

  await expect(async () => {
    const probe = await tauriPage.evaluate(`
      (async () => {
        const tokenResp = await window.__TAURI__.core.invoke('get_flask_api_token');
        const portResp = await window.__TAURI__.core.invoke('get_flask_port');
        const token = tokenResp?.success ? String(tokenResp.data || '').trim() : '';
        const port = Number(portResp?.data || 0);
        if (!port) return { ok: false, status: 0, payload: { status: 'no-port' } };
        const response = await fetch(
          'http://127.0.0.1:' + port + '/api/health?provider=deepseek',
          {
            headers: token ? { Authorization: 'Bearer ' + token } : {},
          }
        );
        const payload = await response.json().catch(() => ({}));
        return {
          status: response.status,
          ok: response.ok,
          payload,
        };
      })()
    `);
    expect(probe.ok).toBe(true);
    expect(probe.status).toBe(200);
    expect(probe.payload?.status).toBe('healthy');
  }).toPass({ timeout: 90_000 });

  const bridgeResponse = await tauriPage.evaluate(`
    (async () => {
      return await window.__TAURI__.core.invoke('frontend_log', {
        level: 'error',
        message: '[E2E] tauri frontend_log bridge check',
      });
    })()
  `);
  expect(Boolean(bridgeResponse?.success)).toBe(true);
});
