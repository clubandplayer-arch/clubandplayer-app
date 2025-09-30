'use client';

import posthog from 'posthog-js';

export function track(event: string, props?: Record<string, any>) {
  try {
    if ((globalThis as any).posthog) posthog.capture(event, props);
  } catch { /* noop */ }
}
