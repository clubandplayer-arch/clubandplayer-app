<<<<<<< HEAD
// types/opportunity.ts
=======
// Tipi per le opportunità
import type { CountryCode, OpportunityRole, OpportunityStatus } from '@/lib/types/entities';
>>>>>>> codex/verify-repository-correctness

export type Gender = 'male' | 'female' | 'mixed';

export interface Opportunity {
  id: string;
  title: string;
  description?: string | null;

  // Località
  country?: CountryCode | string | null;
  region?: string | null;
  province?: string | null;
  city?: string | null;

  // Profilo sportivo
  sport?: string | null;
  role?: OpportunityRole | string | null;
  status?: OpportunityStatus | string | null;
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
<<<<<<< HEAD

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
=======
  owner_id?: string | null;   // id del club proprietario (snake_case legacy)
  ownerId?: string | null;    // camelCase normalizzato
  created_by?: string | null; // alias legacy → verrà eliminato quando i dati saranno migrati
>>>>>>> codex/verify-repository-correctness

  // Meta
  created_at: string; // ISO string (come da API storiche)
  createdAt?: string; // camelCase per i repo server-side
  updated_at?: string | null;
  updatedAt?: string | null;
}

export interface OpportunitiesApiResponse {
  data: Opportunity[];
  page: number;
  pageSize: number;
  total: number;
}
