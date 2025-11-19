// lib/analytics.ts

type Props = Record<string, unknown>;

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Props }) => void;
  }
}

const isClient = typeof window !== 'undefined';

export function captureSafe(event: string, props?: Props) {
  if (!isClient || typeof window.plausible !== 'function') return;
  try {
    window.plausible(event, props ? { props } : undefined);
  } catch {
    // no-op
  }
}

export function identifySafe() {
  // Plausible non supporta identify: manteniamo una firma compatibile per eventuali import legacy.
}

export const track = captureSafe;
export const identify = identifySafe;

export default { track, identify };
