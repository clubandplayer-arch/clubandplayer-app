// lib/enums.ts

// Valori CANONICI (quelli accettati dal tipo Postgres "playing_category")
export type EnPlayingCategory =
  | 'goalkeeper'
  | 'defender'
  | 'midfielder'
  | 'forward';

export const PLAYING_CATEGORY_EN = [
  'goalkeeper',
  'defender',
  'midfielder',
  'forward',
] as const;

// Etichette IT usate in UI (solo per reference / messaggi)
export const PLAYING_CATEGORY_IT = [
  'portiere',
  'difensore',
  'centrocampista',
  'attaccante',
] as const;

// util per confronti robusti
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

// Sinonimi IT → EN
const itToEn: Record<string, EnPlayingCategory> = {
  // Portiere
  portiere: 'goalkeeper',
  // Difensore
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
  esterno: 'forward',           // esterno alto/ala -> attacco
  'esterno alto': 'forward',
  ala: 'forward',
  'ala destra': 'forward',
  'ala sinistra': 'forward',
};

// Sinonimi EN → EN
const enSyn: Record<string, EnPlayingCategory> = {
  // GK
  goalkeeper: 'goalkeeper',
  keeper: 'goalkeeper',
  gk: 'goalkeeper',
  // DEF
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
  // MID
  midfielder: 'midfielder',
  dm: 'midfielder',
  cm: 'midfielder',
  am: 'midfielder',
  playmaker: 'midfielder',
  // FWD
  forward: 'forward',
  striker: 'forward',
  'center forward': 'forward',
  'centre forward': 'forward',
  cf: 'forward',
  winger: 'forward',
};

// ⚙️ Normalizza qualsiasi label (IT/EN/variazioni) → EN canonico
export function normalizeRequiredCategory(
  input: unknown
): EnPlayingCategory | null {
  if (typeof input !== 'string') return null;
  const s = norm(input);

  // già uno dei canonici
  if ((PLAYING_CATEGORY_EN as readonly string[]).includes(s))
    return s as EnPlayingCategory;

  if (s in itToEn) return itToEn[s];
  if (s in enSyn) return enSyn[s];

  // match parziali robusti
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
