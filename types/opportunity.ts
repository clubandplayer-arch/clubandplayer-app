// types/opportunity.ts

// Genere dell'opportunità: richiesto lato UI, nel DB ha default 'mixed'
export type Gender = 'uomo' | 'donna' | 'mixed';

export interface Opportunity {
  id: string;
  title: string;
  description?: string | null;

  // Località
  country?: string | null;
  region?: string | null;
  province?: string | null;
  city?: string | null;

  // Profilo richiesto
  sport?: string | null;
  role?: string | null;

  // Fascia d’età (es. "17-20", "31+", ecc.)
  age?: string | null;

  // NUOVO: genere richiesto (obbligatorio a livello logico; nel DB default 'mixed')
  gender: Gender;

  // Metadati/ownership
  owner_id?: string | null;     // chi ha creato l’annuncio (club)
  created_at?: string | null;   // ISO string

  // eventuale campo legacy opzionale
  club_name?: string | null;
}

export interface OpportunitiesApiResponse {
  data: Opportunity[];
  page: number;
  pageSize: number;
  total: number;
}
