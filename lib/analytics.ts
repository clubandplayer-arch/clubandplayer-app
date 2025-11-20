// lib/analytics.ts

type Props = Record<string, unknown>;

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Props }) => void;
  }
}

const isClient = typeof window !== 'undefined';

function sanitizeProps(props?: Props): Props | undefined {
  if (!props) return undefined;
  const out: Props = {};
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (typeof v === 'string') {
      out[k] = v.slice(0, 120);
      continue;
    }
    if (typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v;
      continue;
    }
    try {
      out[k] = JSON.stringify(v).slice(0, 200);
    } catch {
      out[k] = String(v).slice(0, 120);
    }
  }
  return Object.keys(out).length ? out : undefined;
}

export function captureSafe(event: string, props?: Props) {
  if (!isClient || typeof window.plausible !== 'function') return;
  try {
    const cleaned = sanitizeProps(props);
    window.plausible(event, cleaned ? { props: cleaned } : undefined);
  } catch {
    // no-op
  }
}

export function identifySafe() {
  // Plausible non supporta identify: manteniamo una firma compatibile per eventuali import legacy.
}

export function trackApplicationConversion(params: { opportunityId: string; source?: string }) {
  const opportunity_id = params.opportunityId?.toString().slice(0, 64);
  const source = params.source?.toString().slice(0, 40);
  captureSafe('application_submit', { opportunity_id, source });
}

export function trackRetention(scope: string) {
  const safeScope = scope?.toString().slice(0, 40) || 'unknown';
  captureSafe('retention_daily_active', { scope: safeScope });
}

export const track = captureSafe;
export const identify = identifySafe;

export default { track, identify, trackApplicationConversion, trackRetention };
