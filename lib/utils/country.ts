const getRegionCodes = (): string[] => {
  try {
    return (Intl as any).supportedValuesOf?.('region') ?? [];
  } catch {
    return [];
  }
};

const REGION_CODES = getRegionCodes();
const DN_IT = new Intl.DisplayNames(['it'], { type: 'region' });
const DN_EN = new Intl.DisplayNames(['en'], { type: 'region' });

const COUNTRY_ALIASES: Record<string, string> = {
  uk: 'GB',
  'u.k.': 'GB',
  'united kingdom': 'GB',
  'great britain': 'GB',
  usa: 'US',
  'u.s.a.': 'US',
  'united states': 'US',
  'stati uniti': 'US',
  'czech republic': 'CZ',
  'repubblica ceca': 'CZ',
  'cote d’ivoire': 'CI',
  "côte d’ivoire": 'CI',
  russia: 'RU',
  'south korea': 'KR',
  'north korea': 'KP',
  'viet nam': 'VN',
  italia: 'IT',
  italy: 'IT',
  francia: 'FR',
  france: 'FR',
  spagna: 'ES',
  spain: 'ES',
  germania: 'DE',
  germany: 'DE',
  portogallo: 'PT',
  portugal: 'PT',
};

export function nameToIso2(value?: string | null): string | null {
  const raw = (value || '').trim();
  if (!raw) return null;
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  const key = raw.toLowerCase();
  if (COUNTRY_ALIASES[key]) return COUNTRY_ALIASES[key];
  for (const code of REGION_CODES) {
    const it = (DN_IT.of(code) || '').toLowerCase();
    const en = (DN_EN.of(code) || '').toLowerCase();
    if (key === it || key === en) return code as string;
  }
  return null;
}

export function countryLabel(value?: string | null): { iso: string | null; label: string } {
  if (!value) return { iso: null, label: '' };
  const iso = nameToIso2(value);
  if (iso) return { iso, label: DN_IT.of(iso) || iso };
  return { iso: null, label: value };
}
