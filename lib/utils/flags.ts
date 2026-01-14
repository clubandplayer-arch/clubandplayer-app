export function countryCodeToFlagEmoji(iso2: string): string | null {
  const code = (iso2 || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  const offset = 0x1f1e6;
  const first = code.charCodeAt(0) - 65 + offset;
  const second = code.charCodeAt(1) - 65 + offset;
  return String.fromCodePoint(first, second);
}
