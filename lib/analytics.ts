// lib/analytics.ts
// Helper lato client per PostHog: tutte le funzioni sono “safe”.
// Non lancia errori in SSR/Edge e non richiede import espliciti di posthog-js qui.

type Props = Record<string, unknown> | undefined;

function ph() {
  if (typeof window === 'undefined') return null;
  try {
    // PostHog viene inizializzato in components/analytics/PostHogInit.tsx
    return (window as any).posthog ?? null;
  } catch {
    return null;
  }
}

function sanitize(props: Props) {
  if (!props) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    switch (typeof v) {
      case 'string':
        out[k] = v.slice(0, 200);
        break;
      case 'number':
      case 'boolean':
        out[k] = v;
        break;
      default:
        try {
          out[k] = JSON.stringify(v).slice(0, 300);
        } catch {
          out[k] = String(v).slice(0, 200);
        }
    }
  }
  return Object.keys(out).length ? out : undefined;
}

/** Traccia un evento senza mai esplodere in SSR/assenza di PH */
export function captureSafe(event: string, props?: Record<string, unknown>) {
  const p = ph();
  if (!p) return;
  try {
    p.capture(event, sanitize(props));
  } catch {
    /* no-op */
  }
}

/** Identify sicuro (passa id per settare, nothing per non fare nulla; usare resetSafe per logout) */
export function identifySafe(distinctId?: string, props?: Record<string, unknown>) {
  const p = ph();
  if (!p) return;
  try {
    if (distinctId) p.identify(distinctId, sanitize(props));
  } catch {
    /* no-op */
  }
}

/** Reset sicuro (usare al logout) */
export function resetSafe() {
  const p = ph();
  if (!p) return;
  try {
    p.reset();
  } catch {
    /* no-op */
  }
}

/** Pageview standard */
export function pageview(path?: string) {
  const p = ph();
  if (!p) return;
  try {
    p.capture('$pageview', {
      $current_url: typeof location !== 'undefined' ? location.href : undefined,
      path,
    });
  } catch {
    /* no-op */
  }
}
