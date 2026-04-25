/**
 * In Vite/browser (no Tauri), discover the local Flask port by probing /api/health,
 * matching the port range used in src-tauri get_flask_port.
 */

const DEFAULT_PORT_MIN = 5000;
const DEFAULT_PORT_MAX = 5100;
const BATCH_SIZE = 24;
const PING_MS = 280;

function probeHost(): string {
  const raw = import.meta.env.VITE_FLASK_PROBE_HOST as string | undefined;
  return raw?.trim() ? raw.trim() : '127.0.0.1';
}

function portRange(): { min: number; max: number } {
  const min = Number(
    import.meta.env.VITE_FLASK_PROBE_PORT_MIN ?? DEFAULT_PORT_MIN
  );
  const max = Number(
    import.meta.env.VITE_FLASK_PROBE_PORT_MAX ?? DEFAULT_PORT_MAX
  );
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    return { min: DEFAULT_PORT_MIN, max: DEFAULT_PORT_MAX };
  }
  return { min, max };
}

async function pingHealth(host: string, port: number): Promise<number | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), PING_MS);
  try {
    const res = await fetch(`http://${host}:${port}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    return res.ok ? port : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Returns the first port in range where GET /api/health succeeds, or null.
 */
export async function discoverFlaskPortBrowser(): Promise<number | null> {
  const host = probeHost();
  const { min, max } = portRange();

  for (let batchStart = min; batchStart <= max; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, max);
    const ports: number[] = [];
    for (let p = batchStart; p <= batchEnd; p++) ports.push(p);

    try {
      const port = await Promise.any(
        ports.map(async (p) => {
          const hit = await pingHealth(host, p);
          if (hit == null) {
            throw new Error('miss');
          }
          return hit;
        })
      );
      return port;
    } catch {
      /* all ports in batch missed */
    }
  }

  return null;
}
