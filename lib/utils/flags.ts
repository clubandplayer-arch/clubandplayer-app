export function normalizeIso2(input?: string | null): string | null {
  const s = (input ?? '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(s) ? s : null;
}

export function iso2ToFlagEmoji(input?: string | null): string | null {
  const iso2 = normalizeIso2(input);
  if (!iso2) return null;
  const A = 65;
  const base = 0x1f1e6;
  const [c1, c2] = iso2.split('');
  return String.fromCodePoint(base + (c1.charCodeAt(0) - A), base + (c2.charCodeAt(0) - A));
}

export function parsePrefixedCountry(
  text?: string | null
): { iso2: string | null; label: string | null } {
  const s = (text ?? '').trim();
  const m = s.match(/^([A-Za-z]{2})\s+(.+)$/);
  if (!m) return { iso2: null, label: s || null };
  return { iso2: normalizeIso2(m[1]), label: m[2].trim() || null };
}
