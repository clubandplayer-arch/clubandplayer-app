// lib/analytics.ts
import posthog from 'posthog-js';

export function captureSafe(event: string, props?: Record<string, unknown>) {
  try {
    if (typeof window === 'undefined') return;
    if (!posthog || !posthog.capture) return;
    posthog.capture(event, props ?? {});
  } catch {
    // no-op
  }
}
