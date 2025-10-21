// lib/enums.ts
export const PLAYING_CATEGORY = [
  'portiere',
  'difensore',
  'centrocampista',
  'attaccante',
] as const;
export type PlayingCategory = typeof PLAYING_CATEGORY[number];

export const PLAYING_CATEGORY_LABEL: Record<PlayingCategory, string> = {
  portiere: 'Portiere',
  difensore: 'Difensore',
  centrocampista: 'Centrocampista',
  attaccante: 'Attaccante',
};

/** Normalizza etichette/sinonimi → slug enum accettato dal DB */
export function normalizePlayingCategory(input: unknown): PlayingCategory | null {
  if (input == null) return null;
  const s = String(input).trim().toLowerCase();
  const n = s.normalize('NFD').replace(/\p{Diacritic}/gu, ''); // rimuove accenti

  switch (n) {
    case 'portiere':
    case 'goalkeeper':
      return 'portiere';

    case 'difensore':
    case 'difensore centrale':
    case 'terzino':
    case 'terzino/esterno difensivo':
    case 'esterno difensivo':
    case 'defender':
      return 'difensore';

    case 'centrocampista':
    case 'centrocampista centrale':
    case 'centrocampista difensivo':
    case 'centrocampista offensivo':
    case 'mezzala':
    case 'mediano':
    case 'regista':
    case 'midfielder':
      return 'centrocampista';

    case 'attaccante':
    case 'punta':
    case 'seconda punta':
    case 'ala':
    case 'esterno offensivo':
    case 'esterno offensivo/ala':
    case 'forward':
      return 'attaccante';
  }

  // se già slug valido, accettalo
  if (PLAYING_CATEGORY.includes(n as PlayingCategory)) return n as PlayingCategory;
  return null;
}
