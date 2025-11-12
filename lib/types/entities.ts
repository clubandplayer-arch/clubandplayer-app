// lib/types/entities.ts

// --- Costanti e unioni riutilizzabili ---
export const OPPORTUNITY_ROLES = ["player", "coach", "staff", "scout", "director"] as const;
export type OpportunityRole = (typeof OPPORTUNITY_ROLES)[number];

export const COUNTRY_CODES = ["IT", "ES", "FR", "DE", "UK", "US"] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export const OPPORTUNITY_STATUS = ["open", "closed", "draft", "archived"] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUS)[number];

export const CLUB_STATUS = ["active", "inactive", "archived"] as const;
export type ClubStatus = (typeof CLUB_STATUS)[number];

// --- Filtri comuni (coerenti con SavedViews/URL) ---
export type SearchFilters = {
  q?: string;
  role?: string; // compat: presente su Opportunities; accettato/ignorato su Clubs
  country?: string;
  status?: string;
  city?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
};

// Versione “normalizzata” (stringhe vuote -> undefined)
export type NormalizedFilters = Required<Record<keyof SearchFilters, string | undefined>>;

// --- Paginazione ---
export type Paginated<T> = {
  items: T[];
  total: number;
  hasMore: boolean;
};
