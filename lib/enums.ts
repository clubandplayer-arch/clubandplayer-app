// lib/enums.ts

// Valori canonici in ITA: questi sono quelli ammessi dall'enum Postgres (playing_category)
export const PLAYING_CATEGORY_IT = [
  'portiere',
  'difensore',
  'centrocampista',
  'attaccante',
] as const;

export type PlayingCategoryIt = (typeof PLAYING_CATEGORY_IT)[number];

// Alcune traduzioni/alias EN -> IT
const EN_TO_IT: Record<string, PlayingCategoryIt> = {
  goalkeeper: 'portiere',
  keeper: 'portiere',
  gk: 'portiere',
  defender: 'difensore',
  fullback: 'difensore',
  centerback: 'difensore',
  cb: 'difensore',
  midfielder: 'centrocampista',
  cm: 'centrocampista',
  dm: 'centrocampista',
  am: 'centrocampista',
  winger: 'attaccante',
  forward: 'attaccante',
  striker: 'attaccante',
  fw: 'attaccante',
};

// Normalizza qualsiasi etichetta testo in uno dei 4 valori ammessi in IT
export function normalizeRequiredCategory(input: unknown): PlayingCategoryIt | null {
  if (typeof input !== 'string') return null;
  const v = input.trim().toLowerCase();

  // 1) già canonico?
  if ((PLAYING_CATEGORY_IT as readonly string[]).includes(v)) {
    return v as PlayingCategoryIt;
  }

  // 2) nomi inglesi comuni
  if (v in EN_TO_IT) return EN_TO_IT[v];

  // 3) euristiche per ruoli italiani (si guardano pattern parziali)
  if (/portier/.test(v)) return 'portiere';

  // difesa: "difensore", "terzino", "centrale difensivo", "esterno difensivo", "stopper"
  if (
    /difens|terzin|centrale\s*difens|estern[oai]\s*difens|stopper|marcator/.test(v)
  ) {
    return 'difensore';
  }

  // centrocampo: "centrocampista", "mediano", "mezzala", "regista", "trequartista", "interno"
  if (/centrocamp|mediano|mezzal|regist|trequart|interno/.test(v)) {
    return 'centrocampista';
  }

  // attacco: "attaccante", "punta", "seconda punta", "esterno" (ala), "ala", "centravanti"
  if (/attacc|punt|seconda\s*punt|estern[oa](?!\s*difens)|ala|centravant/.test(v)) {
    return 'attaccante';
  }

  return null;
}
