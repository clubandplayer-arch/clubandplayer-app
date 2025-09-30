// lib/analytics.ts
// Helper sicuri/no-op per PostHog lato client, così non esplode nulla se non inizializzato.

type Props = Record<string, any> | undefined;

function getPH(): any | null {
  try {
    if (typeof window === 'undefined') return null;
    // @ts-ignore
    return (window as any).posthog ?? null;
  } catch {
    return null;
  }
}

/** Traccia un evento PostHog in modo sicuro (no-op se non disponibile). */
export function captureSafe(event: string, properties?: Props) {
  try {
    const ph = getPH();
    if (ph && typeof ph.capture === 'function') {
      ph.capture(event, properties ?? {});
    }
  } catch {
    /* no-op */
  }
}

/** Alias più breve, alcuni file usano `track(...)`. */
export const track = captureSafe;

/** Identifica l’utente in modo sicuro (no-op se non disponibile). */
export function identifySafe(distinctId: string, properties?: Props) {
  try {
    const ph = getPH();
    if (ph && typeof ph.identify === 'function') {
      ph.identify(distinctId, properties ?? {});
    }
  } catch {
    /* no-op */
  }
}

/** Opt-in tracciamento (usato per consenso cookie). */
export function optInAnalytics() {
  try {
    const ph = getPH();
    if (ph?.opt_in_capturing) ph.opt_in_capturing();
  } catch {
    /* no-op */
  }
}

/** Opt-out tracciamento (usato per consenso cookie). */
export function optOutAnalytics() {
  try {
    const ph = getPH();
    if (ph?.opt_out_capturing) ph.opt_out_capturing();
  } catch {
    /* no-op */
  }
}

/** Ritorna true se l’utente ha già dato consenso al tracciamento. */
export function hasConsented(): boolean {
  try {
    const ph = getPH();
    if (!ph) return false;
    // PostHog salva un cookie; se l’SDK è opt-in, questo metodo è comodo da esporre.
    // Alcune versioni hanno ph.has_opted_in_capturing()
    if (typeof ph.has_opted_in_capturing === 'function') {
      return !!ph.has_opted_in_capturing();
    }
    return true; // fallback
  } catch {
    return false;
  }
}
