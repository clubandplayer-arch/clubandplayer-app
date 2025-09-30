// lib/analytics.ts
import posthog from 'posthog-js';

/**
 * Invio evento a PostHog protetto da try/catch e da check lato client.
 */
export function captureSafe(event: string, props?: Record<string, unknown>) {
  try {
    if (typeof window === 'undefined') return;
    if (!posthog || typeof posthog.capture !== 'function') return;
    posthog.capture(event, props ?? {});
  } catch {
    // no-op
  }
}

/**
 * Alias retro-compatibile: molti file importano { track } da '@/lib/analytics'.
 * Manteniamo entrambi per comodità.
 */
export const track = captureSafe;
