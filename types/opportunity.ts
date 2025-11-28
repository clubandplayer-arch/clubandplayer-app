// types/opportunity.ts

/** Stato opportunità (compat col codice esistente) */
export type OpportunityStatus = 'open' | 'closed' | 'draft' | 'archived' | (string & {});

/** Ruolo ricercato (teniamo un superset string per compatibilità) */
export type OpportunityRole =
  | 'player'
  | 'coach'
  | 'staff'
  | 'scout'
  | 'director'
  | (string & {});

/** Sport (superset string per compatibilità) */
export type OpportunitySport = 'football' | (string & {});

/** Genere target (opzionale) */
export type OpportunityGender =
  | 'uomo'
  | 'donna'
  | 'mixed'
  | 'male'
  | 'female'
  | 'maschile'
  | 'femminile'
  | null;

/**
 * Modello principale opportunità.
 * NB: esponiamo sia snake_case (DB) che camelCase (mock/legacy) per compatibilità.
 */
export type Opportunity = {
  /** ID opportunità */
  id: string;

  /** Titolo */
  title: string;

  /** Descrizione (facoltativa) */
  description?: string | null;

  /** Proprietario (DB snake_case) */
  owner_id?: string | null;

  /** Alias legacy del proprietario (alcune parti del codice usano created_by) */
  created_by?: string | null;

  /** Timestamp creazione (DB snake_case ISO) */
  created_at?: string | null;

  /** Alias camelCase usato nel mock repo/search */
  createdAt?: string | null;

  /** Localizzazione */
  country?: string | null;   // ISO2 quando disponibile
  region?: string | null;
  province?: string | null;
  city?: string | null;

  /** Dati sportivi */
  sport?: OpportunitySport | null;
  role?: OpportunityRole | null;
  required_category?: string | null; // es. "U17", "Eccellenza", ecc.
  age_min?: number | null;
  age_max?: number | null;
  gender?: OpportunityGender;

  /** Stato pubblicazione */
  status?: OpportunityStatus | null;

  /** Metadati club */
  club_name?: string | null;
  /** Alias camelCase per nome club */
  clubName?: string | null;

  /** ID del club associato (se presente a schema) */
  club_id?: string | null;
};

/** Risposta paginata usata dal client / lista opportunità */
export type OpportunitiesApiResponse = {
  items: Opportunity[];
  total: number;
  hasMore: boolean;
};

export type { Opportunity as default };
