// Tipi per le opportunità
import type { CountryCode, OpportunityRole, OpportunityStatus } from '@/lib/types/entities';

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
  // opzionale: traccia della fascia selezionata a UI (se salvata lato API)
  age_bracket?: string | null;

  // Club/owner
  club_name?: string | null;
  owner_id?: string | null;   // id del club proprietario (snake_case legacy)
  ownerId?: string | null;    // camelCase normalizzato
  created_by?: string | null; // alias legacy → verrà eliminato quando i dati saranno migrati

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
