// lib/enums.ts

// Valori ACCETTATI dal DB (enum playing_category)
export const PLAYING_CATEGORY = ['portiere', 'difensore', 'centrocampista', 'attaccante'] as const;
export type DbPlayingCategory = (typeof PLAYING_CATEGORY)[number];

// sinonimi IT/EN -> slug IT (DB)
const MAP: Record<string, DbPlayingCategory> = {
  // Portiere
  'portiere': 'portiere',
  'por': 'portiere',
  'gk': 'portiere',
  'keeper': 'portiere',
  'goalkeeper': 'portiere',

  // Difensore
  'difensore': 'difensore',
  'difensivo': 'difensore',
  'terzino': 'difensore',
  'centrale difensivo': 'difensore',
  'terzino destro': 'difensore',
  'terzino sinistro': 'difensore',
  'defender': 'difensore',
  'df': 'difensore',
  'rb': 'difensore',
  'lb': 'difensore',
  'cb': 'difensore',
  'wing back': 'difensore',

  // Centrocampista
  'centrocampista': 'centrocampista',
  'mediano': 'centrocampista',
  'mezzala': 'centrocampista',
  'regista': 'centrocampista',
  'trequartista': 'centrocampista',
  'esterno di centrocampo': 'centrocampista',
  'midfielder': 'centrocampista',
  'mf': 'centrocampista',
  'cm': 'centrocampista',
  'dm': 'centrocampista',
  'am': 'centrocampista',
  'rm': 'centrocampista',
  'lm': 'centrocampista',

  // Attaccante
  'attaccante': 'attaccante',
  'punta': 'attaccante',
  'centravanti': 'attaccante',
  'seconda punta': 'attaccante',
  'ala': 'attaccante',
  'esterno offensivo': 'attaccante',
  'forward': 'attaccante',
  'fw': 'attaccante',
  'winger': 'attaccante',
};

function stripDiacritics(s: string) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}
function toKey(s: string) {
  return stripDiacritics(String(s).trim().toLowerCase())
    .replace(/[\/_-]+$/g, '') // es. "Terzino/" -> "terzino"
    .replace(/\s+/g, ' ');
}

/**
 * Accetta label IT/EN/sinonimi e restituisce SEMPRE lo slug IT
 * richiesto dall'enum del DB: 'portiere' | 'difensore' | 'centrocampista' | 'attaccante'
 */
export function normalizePlayingCategory(input: unknown): DbPlayingCategory | null {
  if (input == null) return null;
  let key = toKey(String(input));

  // mappa diretta
  if (MAP[key]) return MAP[key];

  // fallback per match parziali
  if (/(portier|keeper|goalkeep)/.test(key)) return 'portiere';
  if (/(difens|defend|terzin|rb|lb|cb|wing back)/.test(key)) return 'difensore';
  if (/(centrocamp|mediano|mezzala|regist|trequart|midfield|rm|lm|cm|dm|am)/.test(key)) return 'centrocampista';
  if (/(attacc|punta|centravant|seconda punta|ala|esterno offens|wing|forward|fw)/.test(key)) return 'attaccante';

  return null;
}
