// lib/enums.ts

// Slug IT accettati in alcuni DB
export const PLAYING_CATEGORY_IT = [
  'portiere',
  'difensore',
  'centrocampista',
  'attaccante',
] as const;
export type ItPlayingCategory = (typeof PLAYING_CATEGORY_IT)[number];

// Slug EN accettati in altri DB
export const PLAYING_CATEGORY_EN = [
  'goalkeeper',
  'defender',
  'midfielder',
  'forward',
] as const;
export type EnPlayingCategory = (typeof PLAYING_CATEGORY_EN)[number];

function stripDiacritics(s: string) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}
function toKey(s: string) {
  return stripDiacritics(String(s).trim().toLowerCase())
    .replace(/[\/_-]+$/g, '') // es. "Terzino/" -> "terzino"
    .replace(/\s+/g, ' ');
}

// sinonimi -> IT
const MAP_IT: Record<string, ItPlayingCategory> = {
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
  'terzino destro': 'difensore',
  'terzino sinistro': 'difensore',
  'centrale difensivo': 'difensore',
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

// sinonimi -> EN
const MAP_EN: Record<string, EnPlayingCategory> = {
  'goalkeeper': 'goalkeeper',
  'gk': 'goalkeeper',
  'keeper': 'goalkeeper',
  'portiere': 'goalkeeper',

  'defender': 'defender',
  'df': 'defender',
  'rb': 'defender',
  'lb': 'defender',
  'cb': 'defender',
  'wing back': 'defender',
  'difensore': 'defender',
  'terzino': 'defender',

  'midfielder': 'midfielder',
  'mf': 'midfielder',
  'cm': 'midfielder',
  'dm': 'midfielder',
  'am': 'midfielder',
  'rm': 'midfielder',
  'lm': 'midfielder',
  'centrocampista': 'midfielder',
  'mediano': 'midfielder',
  'mezzala': 'midfielder',
  'regista': 'midfielder',
  'trequartista': 'midfielder',

  'forward': 'forward',
  'fw': 'forward',
  'winger': 'forward',
  'attaccante': 'forward',
  'punta': 'forward',
  'centravanti': 'forward',
  'seconda punta': 'forward',
  'ala': 'forward',
  'esterno offensivo': 'forward',
};

/**
 * Dato un input (IT/EN/sinonimi), restituisce i candidati:
 *  - it: slug italiano (se derivabile)
 *  - en: slug inglese (se derivabile)
 */
export function normalizePlayingCategoryCandidates(
  input: unknown
): { it: ItPlayingCategory | null; en: EnPlayingCategory | null } {
  if (input == null) return { it: null, en: null };
  const key = toKey(String(input));

  const it = MAP_IT[key] ?? (
    /(portier|keeper|goalkeep)/.test(key) ? 'portiere' :
    /(difens|defend|terzin|rb|lb|cb|wing back)/.test(key) ? 'difensore' :
    /(centrocamp|mediano|mezzala|regist|trequart|midfield|rm|lm|cm|dm|am)/.test(key) ? 'centrocampista' :
    /(attacc|punta|centravant|seconda punta|ala|esterno offens|wing|forward|fw)/.test(key) ? 'attaccante' :
    null
  );

  const en = MAP_EN[key] ?? (
    /(portier|keeper|goalkeep)/.test(key) ? 'goalkeeper' :
    /(difens|defend|terzin|rb|lb|cb|wing back)/.test(key) ? 'defender' :
    /(centrocamp|mediano|mezzala|regist|trequart|midfield|rm|lm|cm|dm|am)/.test(key) ? 'midfielder' :
    /(attacc|punta|centravant|seconda punta|ala|esterno offens|wing|forward|fw)/.test(key) ? 'forward' :
    null
  );

  return { it, en };
}
