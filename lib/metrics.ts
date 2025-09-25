export type MetricPayload = Record<string, unknown>;

export function trackEvent(name: string, payload: MetricPayload = {}): void {
  try {
    // Stub: sostituibile con GA/Amplitude in E-stage
    console.info('[metric]', name, payload);
  } catch {
    // no-op
  }
}

export function trackClick(label: string, payload: MetricPayload = {}): void {
  trackEvent('click', { label, ...payload });
}

const timers = new Map<string, number>();

export function timeStart(key: string): void {
  timers.set(key, performance.now());
}

export function timeEnd(key: string, payload: MetricPayload = {}): void {
  const start = timers.get(key);
  if (start != null) {
    const ms = performance.now() - start;
    timers.delete(key);
    trackEvent('timing', { key, ms: Math.round(ms), ...payload });
  }
}
