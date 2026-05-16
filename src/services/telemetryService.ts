import { invoke } from '@tauri-apps/api/core';
import { store } from '@/store';

const TELEMETRY_COUNTERS_KEY = 'ooc.telemetry.counters';

type TelemetryEventName =
  | 'app_started'
  | 'chat_message_sent'
  | 'app_error';

interface TelemetryEvent {
  name: TelemetryEventName;
  ts: number;
  payload?: Record<string, unknown>;
}

function isTelemetryEnabled(): boolean {
  return Boolean(
    store.getState().settings.settings.advanced.enableAnonymousTelemetry
  );
}

function readCounters(): Record<string, number> {
  try {
    const raw = localStorage.getItem(TELEMETRY_COUNTERS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function writeCounters(counters: Record<string, number>): void {
  try {
    localStorage.setItem(TELEMETRY_COUNTERS_KEY, JSON.stringify(counters));
  } catch {
    // Ignore storage errors to keep telemetry non-blocking.
  }
}

function incrementCounter(name: TelemetryEventName): void {
  const counters = readCounters();
  counters[name] = (counters[name] ?? 0) + 1;
  writeCounters(counters);
}

export async function trackTelemetryEvent(
  name: TelemetryEventName,
  payload?: Record<string, unknown>
): Promise<void> {
  if (!isTelemetryEnabled()) return;

  incrementCounter(name);
  const event: TelemetryEvent = {
    name,
    ts: Date.now(),
    payload,
  };

  try {
    await invoke('frontend_log', {
      level: 'info',
      message: `[telemetry] ${JSON.stringify(event)}`,
    });
  } catch {
    // Do not surface telemetry failures to users.
  }
}

export function getTelemetryCounters(): Record<string, number> {
  return readCounters();
}
