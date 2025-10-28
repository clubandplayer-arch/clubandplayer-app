// lib/analytics.ts
import type { PostHog } from 'posthog-js';

type Props = Record<string, unknown>;

declare global {
  interface Window {
    // deve combaciare con la dichiarazione in PostHogInit.tsx
    posthog?: PostHog;
  }
}

const isClient = typeof window !== 'undefined';

export function captureSafe(event: string, props?: Props) {
  if (isClient && window.posthog) {
    try {
      window.posthog.capture(event, props);
    } catch {
      // no-op
    }
  }
}

export function identifySafe(id: string, props?: Props) {
  if (isClient && window.posthog) {
    try {
      window.posthog.identify(id, props);
    } catch {
      // no-op
    }
  }
}

// Compat: alcuni file importano { track } / { identify }
export const track = captureSafe;
export const identify = identifySafe;

export default { track, identify };
