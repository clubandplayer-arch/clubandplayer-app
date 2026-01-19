export function normalizeExternalUrl(input: string | null | undefined): string | null {
  const raw = (input ?? '').trim();
  if (!raw) return null;

  // blocca schemi pericolosi
  if (/^(javascript|data):/i.test(raw)) return null;

  // internal route (non toccare)
  if (raw.startsWith('/')) return raw;

  // protocol-relative
  if (raw.startsWith('//')) return `https:${raw}`;

  // già assoluto
  if (/^https?:\/\//i.test(raw)) return raw;

  // altri schemi (mailto/tel) — se non li usate mai, puoi anche rimuovere questa riga
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return raw;

  // fallback: aggiungi https
  return `https://${raw}`;
}
