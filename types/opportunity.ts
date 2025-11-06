// types/opportunity.ts

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
  /**
   * Eventuale fascia età leggibile (es. "18-22") salvata lato API/UI.
   * Solo decorativo, non usato per filtri logici.
   */
  age_bracket?: string | null;

  // Club / owner
  club_name?: string | null;

  /**
   * Owner "vero" dell'opportunità.
   * - nei dati nuovi deve essere valorizzato
   * - nei dati legacy potrebbe essere nullo
   */
  owner_id?: string | null;

  /**
   * Alias legacy: vecchio campo usato come owner.
   * Manteniamo per compatibilità in lettura,
   * ma tutta la logica nuova deve preferire `owner_id`.
   */
  created_by?: string | null;

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
