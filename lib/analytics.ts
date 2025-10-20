// lib/analytics.ts
type Props = Record<string, unknown>;

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, props?: Props) => void;
      identify: (id: string, props?: Props) => void;
    };
  }
}

const isClient = typeof window !== 'undefined';

export function captureSafe(event: string, props?: Props) {
  if (isClient && window.posthog?.capture) {
    try {
      window.posthog.capture(event, props);
    } catch {
      // no-op
    }
  }
}

export function identifySafe(id: string, props?: Props) {
  if (isClient && window.posthog?.identify) {
    try {
      window.posthog.identify(id, props);
    } catch {
      // no-op
    }
  }
}

// Compat: alcuni file importano { track } e { identify }
export const track = captureSafe;
export const identify = identifySafe;

// opzionale: export di comodo
export default { track, identify };
