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

// Normalizza qualunque valore in una stringa leggibile
function toStr(x: any): string {
  if (x == null) return '';
  if (typeof x === 'string') return x;
  if (typeof x === 'number' || typeof x === 'boolean') return String(x);
  if (typeof x === 'object') {
    for (const k of ['nome', 'name', 'denominazione', 'label', 'description']) {
      if (typeof x[k] === 'string') return x[k];
    }
  }
  // fallback finale
  return String(x);
}

/**
 * Carica l’elenco completo Regioni → Province → Città dall’asset statico
 * /geo/italy.min.json. In caso di errore o file mancante, restituisce un
 * fallback minimale (Sicilia → Siracusa con tutti i comuni).
 */
export async function loadItalyGeo(): Promise<ItalyGeo> {
  if (cached) return cached;

  try {
    const res = await fetch('/geo/italy.min.json', { cache: 'force-cache' });
    if (!res.ok) throw new Error(String(res.status));
    const raw: any = await res.json();

    // --- NORMALIZZAZIONE FORZATA A STRINGHE ---
    const regions: string[] = Array.isArray(raw?.regions) ? raw.regions.map(toStr) : [];

    const provincesByRegion: Record<string, string[]> = {};
    if (raw?.provincesByRegion && typeof raw.provincesByRegion === 'object') {
      for (const [k, v] of Object.entries(raw.provincesByRegion)) {
        const key = toStr(k);
        provincesByRegion[key] = Array.isArray(v) ? (v as any[]).map(toStr) : [];
      }
    }

    const citiesByProvince: Record<string, string[]> = {};
    if (raw?.citiesByProvince && typeof raw.citiesByProvince === 'object') {
      for (const [k, v] of Object.entries(raw.citiesByProvince)) {
        const key = toStr(k);
        citiesByProvince[key] = Array.isArray(v) ? (v as any[]).map(toStr) : [];
      }
    }

    cached = { regions, provincesByRegion, citiesByProvince };
    return cached;
  } catch {
    // Fallback minimo, così l’app non si blocca se il file non è presente
    const fallback: ItalyGeo = {
      regions: ['Sicilia'],
      provincesByRegion: { Sicilia: ['Siracusa'] },
      citiesByProvince: {
        Siracusa: [
          'Augusta','Avola','Buccheri','Buscemi','Canicattini Bagni','Carlentini','Cassaro','Ferla',
          'Floridia','Francofonte','Lentini','Melilli','Noto','Pachino','Palazzolo Acreide',
          'Portopalo di Capo Passero','Priolo Gargallo','Rosolini','Siracusa','Solarino','Sortino',
        ],
      },
    };
    cached = fallback;
    return fallback;
  }
}
