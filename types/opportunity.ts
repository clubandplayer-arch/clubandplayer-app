// Tipi per le opportunità

export type Gender = 'male' | 'female' | 'mixed';

export interface Opportunity {
  id: string;
  title: string;
  description?: string | null;

  // Località
  country?: string | null;
  region?: string | null;
  province?: string | null;
  city?: string | null;

  // Profilo sportivo
  sport?: string | null;
  role?: string | null;
  gender?: Gender | null;

  // Età
  age_min?: number | null;
  age_max?: number | null;
  // opzionale: traccia della fascia selezionata a UI (se salvata lato API)
  age_bracket?: string | null;

  // Club/owner
  club_name?: string | null;
  created_by?: string | null; // id del club owner (presente nelle tue UI)
  owner_id?: string | null; // opzionale per compatibilità retro

  // Meta
  created_at: string; // ISO string
  updated_at?: string | null;
}

export interface OpportunitiesApiResponse {
  data: Opportunity[];
  page: number;
  pageSize: number;
  total: number;
}
