// lib/enums.ts
export const PLAYING_CATEGORY = [
  'goalkeeper',
  'defender',
  'midfielder',
  'forward',
] as const;
export type PlayingCategory = typeof PLAYING_CATEGORY[number];

// per mostrare etichette italiane quando serve
export const PLAYING_CATEGORY_LABEL: Record<PlayingCategory, string> = {
  goalkeeper: 'Portiere',
  defender: 'Difensore',
  midfielder: 'Centrocampista',
  forward: 'Attaccante',
};

/** Converte etichette/sinonimi IT/EN → slug enum (EN) accettato dal DB */
export function normalizePlayingCategory(input: unknown): PlayingCategory | null {
  if (input == null) return null;
  const s = String(input).trim().toLowerCase();
  const n = s.normalize('NFD').replace(/\p{Diacritic}/gu, ''); // rimuove accenti

  // se già slug valido inglese, accettalo
  if (PLAYING_CATEGORY.includes(n as PlayingCategory)) {
    return n as PlayingCategory;
  }

  switch (n) {
    // Portiere
    case 'portiere':
    case 'gk':
    case 'goalkeeper':
      return 'goalkeeper';

    // Difensore (qualsiasi ruolo difensivo)
    case 'difensore':
    case 'difensore centrale':
    case 'centrale':
    case 'terzino':
    case 'terzino sinistro':
    case 'terzino destro':
    case 'esterno difensivo':
    case 'terzino/esterno difensivo':
    case 'defender':
    case 'cb':
    case 'lb':
    case 'rb':
      return 'defender';

    // Centrocampista
    case 'centrocampista':
    case 'centrocampista centrale':
    case 'mezzala':
    case 'mediano':
    case 'regista':
    case 'trequartista':
    case 'midfielder':
    case 'cm':
    case 'dm':
    case 'am':
      return 'midfielder';

    // Attaccante / Ala
    case 'attaccante':
    case 'punta':
    case 'seconda punta':
    case 'ala':
    case 'esterno offensivo':
    case 'esterno offensivo/ala':
    case 'winger':
    case 'striker':
    case 'forward':
      return 'forward';
  }
  return null;
}
