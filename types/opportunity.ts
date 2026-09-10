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
export type OpportunityRoleGroup = 'player' | 'staff';

export type OpportunityCanonicalArea = {
  id: string;
  countryId: string;
  parentId: string | null;
  officialName: string;
  areaType: string;
  level: number;
};

export type OpportunityGeography = {
  source: 'canonical' | 'canonical_country' | 'legacy_text' | 'none';
  countryId: string | null;
  countryIso2: string | null;
  countryName: string | null;
  geoAreaId: string | null;
  ancestors: OpportunityCanonicalArea[];
  area: OpportunityCanonicalArea | null;
  legacy: { country: string | null; region: string | null; province: string | null; city: string | null };
};

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
  country_id?: string | null;
  geo_area_id?: string | null;
  geography?: OpportunityGeography;

  /** Dati sportivi */
  sport?: OpportunitySport | null;
  sport_id?: string | null;
  sport_discipline_id?: string | null;
  sport_variant_id?: string | null;
  primarySport?: { sportId: string; disciplineId: string | null; variantId: string | null } | null;
  role?: OpportunityRole | null;
  role_group?: OpportunityRoleGroup | null;
  roleGroup?: OpportunityRoleGroup;
  category?: string | null; // livello/lega dell'opportunità
  required_category?: string | null; // es. "U17", "Eccellenza", ecc.
  age_min?: number | null;
  age_max?: number | null;
  gender?: OpportunityGender;
  genderCode?: 'male' | 'female' | 'mixed' | null;
  gender_code?: 'male' | 'female' | 'mixed' | null;
  playerPositionId?: string | null;
  player_position_id?: string | null;
  staffRoleId?: string | null;
  staff_role_id?: string | null;

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
  totalIsExact?: boolean;
  page?: number;
  pageSize?: number;
  pageCount?: number;
};

export type { Opportunity as default };
