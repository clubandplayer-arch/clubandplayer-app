// lib/enums.ts

export type EnPlayingCategory =
  | 'goalkeeper'
  | 'defender'
  | 'midfielder'
  | 'forward';

export type ItPlayingCategory =
  | 'portiere'
  | 'difensore'
  | 'centrocampista'
  | 'attaccante';

export const PLAYING_CATEGORY_EN = [
  'goalkeeper',
  'defender',
  'midfielder',
  'forward',
] as const;

export const PLAYING_CATEGORY_IT = [
  'portiere',
  'difensore',
  'centrocampista',
  'attaccante',
] as const;

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

// ---- map IT -> EN (sinonimi italiani) ----
const itToEn: Record<string, EnPlayingCategory> = {
  // Portiere
  portiere: 'goalkeeper',

  // Difesa
  difensore: 'defender',
  'difensore centrale': 'defender',
  'centrale difensivo': 'defender',
  terzino: 'defender',
  'terzino destro': 'defender',
  'terzino sinistro': 'defender',
  'esterno difensivo': 'defender',
  braccetto: 'defender',

  // Centrocampo
  centrocampista: 'midfielder',
  mediano: 'midfielder',
  mezzala: 'midfielder',
  regista: 'midfielder',
  trequartista: 'midfielder',
  interno: 'midfielder',

  // Attacco
  attaccante: 'forward',
  punta: 'forward',
  'punta centrale': 'forward',
  'seconda punta': 'forward',
  esterno: 'forward',
  'esterno alto': 'forward',
  ala: 'forward',
  'ala destra': 'forward',
  'ala sinistra': 'forward',
};

// ---- map EN -> EN (sinonimi inglesi) ----
const enSyn: Record<string, EnPlayingCategory> = {
  goalkeeper: 'goalkeeper',
  keeper: 'goalkeeper',
  gk: 'goalkeeper',

  defender: 'defender',
  'centre-back': 'defender',
  'center-back': 'defender',
  cb: 'defender',
  fullback: 'defender',
  'left back': 'defender',
  'right back': 'defender',
  lb: 'defender',
  rb: 'defender',
  wingback: 'defender',

  midfielder: 'midfielder',
  dm: 'midfielder',
  cm: 'midfielder',
  am: 'midfielder',
  playmaker: 'midfielder',

  forward: 'forward',
  striker: 'forward',
  'center forward': 'forward',
  'centre forward': 'forward',
  cf: 'forward',
  winger: 'forward',
};

// ---- map EN canonico -> IT canonico ----
export const enToIt: Record<EnPlayingCategory, ItPlayingCategory> = {
  goalkeeper: 'portiere',
  defender: 'difensore',
  midfielder: 'centrocampista',
  forward: 'attaccante',
};

// ---- map IT canonico -> EN canonico ----
export const itToEnCanon: Record<ItPlayingCategory, EnPlayingCategory> = {
  portiere: 'goalkeeper',
  difensore: 'defender',
  centrocampista: 'midfielder',
  attaccante: 'forward',
};

// Normalizza verso EN canonico
export function normalizeToEN(input: unknown): EnPlayingCategory | null {
  if (typeof input !== 'string') return null;
  const s = norm(input);

  if ((PLAYING_CATEGORY_EN as readonly string[]).includes(s))
    return s as EnPlayingCategory;

  if (s in itToEn) return itToEn[s];
  if (s in enSyn) return enSyn[s];

  if (s.includes('portier')) return 'goalkeeper';
  if (s.includes('terzin') || s.includes('difens') || s.includes('back'))
    return 'defender';
  if (
    s.includes('median') ||
    s.includes('mezzala') ||
    s.includes('regist') ||
    s.includes('centrocamp') ||
    s === 'cm' ||
    s === 'dm' ||
    s === 'am'
  )
    return 'midfielder';
  if (
    s.includes('punta') ||
    s.includes('attacc') ||
    s.includes('esterno') ||
    s.includes('ala') ||
    s.includes('forward') ||
    s.includes('strik') ||
    s.includes('winger')
  )
    return 'forward';

  return null;
}

// Normalizza verso IT canonico
export function normalizeToIT(input: unknown): ItPlayingCategory | null {
  const en = normalizeToEN(input);
  return en ? enToIt[en] : null;
}
