// lib/enums.ts

export type EnPlayingCategory = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
export type ItPlayingCategory = 'portiere' | 'difensore' | 'centrocampista' | 'attaccante';

export const PLAYING_CATEGORY_EN = ['goalkeeper','defender','midfielder','forward'] as const;
export const PLAYING_CATEGORY_IT = ['portiere','difensore','centrocampista','attaccante'] as const;

function norm(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

// ---- map IT -> EN (sinonimi italiani) ----
const itToEn: Record<string, EnPlayingCategory> = {
  // Portiere
  portiere: 'goalkeeper',
  'estremo difensore': 'goalkeeper',
  por: 'goalkeeper',
  port: 'goalkeeper',

  // Difesa
  difensore: 'defender',
  'difensore centrale': 'defender',
  'centrale difensivo': 'defender',
  terzino: 'defender',
  'terzino destro': 'defender',
  'terzino sinistro': 'defender',
  'esterno difensivo': 'defender',
  'esterno basso': 'defender',
  braccetto: 'defender',
  stopper: 'defender',
  libero: 'defender',

  // Centrocampo
  centrocampista: 'midfielder',
  mediano: 'midfielder',
  mezzala: 'midfielder',
  interno: 'midfielder',
  regista: 'midfielder',
  trequartista: 'midfielder',
  'esterno di centrocampo': 'midfielder',

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
  centravanti: 'forward',
};

// ---- map EN -> EN (sinonimi inglesi) ----
const enSyn: Record<string, EnPlayingCategory> = {
  goalkeeper: 'goalkeeper', keeper: 'goalkeeper', gk: 'goalkeeper',

  defender: 'defender',
  'centre-back': 'defender', 'center-back': 'defender', cb: 'defender',
  fullback: 'defender', 'left back': 'defender', 'right back': 'defender',
  lb: 'defender', rb: 'defender', wingback: 'defender',

  midfielder: 'midfielder', dm: 'midfielder', cm: 'midfielder', am: 'midfielder',
  playmaker: 'midfielder',

  forward: 'forward', striker: 'forward',
  'center forward': 'forward', 'centre forward': 'forward', cf: 'forward',
  winger: 'forward', rw: 'forward', lw: 'forward', fw: 'forward',
};

// EN canonico -> IT canonico
export const enToIt: Record<EnPlayingCategory, ItPlayingCategory> = {
  goalkeeper: 'portiere',
  defender: 'difensore',
  midfielder: 'centrocampista',
  forward: 'attaccante',
};

// IT canonico -> EN canonico
export const itToEnCanon: Record<ItPlayingCategory, EnPlayingCategory> = {
  portiere: 'goalkeeper',
  difensore: 'defender',
  centrocampista: 'midfielder',
  attaccante: 'forward',
};

// Normalizza VERSO EN canonico partendo da qualunque stringa nota
export function normalizeToEN(input: unknown): EnPlayingCategory | null {
  if (typeof input !== 'string') return null;
  const s = norm(input);

  if ((PLAYING_CATEGORY_EN as readonly string[]).includes(s)) return s as EnPlayingCategory;
  if (s in itToEn) return itToEn[s];
  if (s in enSyn) return enSyn[s];

  // fallback keyword
  if (s.includes('portier') || s === 'por' || s === 'port' || s === 'gk') return 'goalkeeper';
  if (s.includes('terzin') || s.includes('difens') || s.includes('back') || ['cb','rb','lb'].includes(s)) return 'defender';
  if (s.includes('median') || s.includes('mezzala') || s.includes('regist') || s.includes('centrocamp') || ['cm','dm','am'].includes(s)) return 'midfielder';
  if (s.includes('punta') || s.includes('attacc') || s.includes('esterno') || s.includes('ala') || s.includes('wing') || s.includes('forward') || ['cf','rw','lw','fw'].includes(s)) return 'forward';

  return null;
}

// Normalizza VERSO IT canonico (wrap su normalizeToEN)
export function normalizeToIT(input: unknown): ItPlayingCategory | null {
  const en = normalizeToEN(input);
  return en ? enToIt[en] : null;
}
