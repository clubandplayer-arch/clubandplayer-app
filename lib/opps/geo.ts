// lib/opps/geo.ts

// Tipo del payload statico che serviamo da /public/geo/italy.min.json
export type ItalyGeo = {
  regions: string[];
  provincesByRegion: Record<string, string[]>;
  citiesByProvince: Record<string, string[]>;
};

// Paesi (con "Altro…" che abilita input libero)
export const COUNTRIES = [
  { code: 'IT', label: 'Italia' },
  { code: 'ES', label: 'Spagna' },
  { code: 'FR', label: 'Francia' },
  { code: 'DE', label: 'Germania' },
  { code: 'GB', label: 'Regno Unito' },
  { code: 'PT', label: 'Portogallo' },
  { code: 'NL', label: 'Paesi Bassi' },
  { code: 'BE', label: 'Belgio' },
  { code: 'CH', label: 'Svizzera' },
  { code: 'US', label: 'USA' },
  { code: 'BR', label: 'Brasile' },
  { code: 'AR', label: 'Argentina' },
  { code: 'OTHER', label: 'Altro…' },
];

// Cache in-memory per evitare richieste ripetute
let cached: ItalyGeo | null = null;

/**
 * Carica l’elenco completo Regioni → Province → Città dall’asset statico
 * /geo/italy.min.json. In caso di errore o file mancante, restituisce un
 * fallback minimale (Sicilia → Siracusa con tutti i comuni).
 *
 * Usabile direttamente nei Client Components:
 *   const geo = await loadItalyGeo()
 *   geo.regions, geo.provincesByRegion[regione], geo.citiesByProvince[provincia]
 */
export async function loadItalyGeo(): Promise<ItalyGeo> {
  if (cached) return cached;

  try {
    const res = await fetch('/geo/italy.min.json', { cache: 'force-cache' });
    if (!res.ok) throw new Error(String(res.status));
    cached = (await res.json()) as ItalyGeo;

    // Semplice validazione strutturale
    if (
      !cached ||
      !Array.isArray(cached.regions) ||
      typeof cached.provincesByRegion !== 'object' ||
      typeof cached.citiesByProvince !== 'object'
    ) {
      throw new Error('Invalid italy.min.json structure');
    }

    return cached;
  } catch {
    // Fallback minimo, così l’app non si blocca se il file non è presente
    const fallback: ItalyGeo = {
      regions: ['Sicilia'],
      provincesByRegion: {
        Sicilia: ['Siracusa'],
      },
      citiesByProvince: {
        Siracusa: [
          'Augusta',
          'Avola',
          'Buccheri',
          'Buscemi',
          'Canicattini Bagni',
          'Carlentini',
          'Cassaro',
          'Ferla',
          'Floridia',
          'Francofonte',
          'Lentini',
          'Melilli',
          'Noto',
          'Pachino',
          'Palazzolo Acreide',
          'Portopalo di Capo Passero',
          'Priolo Gargallo',
          'Rosolini',
          'Siracusa',
          'Solarino',
          'Sortino',
        ],
      },
    };
    cached = fallback;
    return fallback;
  }
}
