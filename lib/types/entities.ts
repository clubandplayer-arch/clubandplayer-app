// lib/types/entities.ts

// --- Entità ---
export type OpportunityRole = "player" | "coach" | "staff" | "scout" | "director";
export type CountryCode = "IT" | "ES" | "FR" | "DE" | "UK" | "US";
export type OpportunityStatus = "open" | "closed" | "draft" | "archived";
export type ClubStatus = "active" | "inactive" | "archived";

export type Opportunity = {
  id: string;
  title: string;
  role?: OpportunityRole;
  country?: CountryCode;
  city?: string;
  status?: OpportunityStatus;
  createdAt: string; // YYYY-MM-DD
};

export type Club = {
  id: string;
  name: string;
  country?: CountryCode;
  city?: string;
  status?: ClubStatus;
  createdAt: string; // YYYY-MM-DD
};

// --- Filtri comuni (coerenti con SavedViews/URL) ---
export type SearchFilters = {
  q?: string;
  role?: string;        // compat: presente su Opportunities; accettato/ignorato su Clubs
  country?: string;
  status?: string;
  city?: string;
  from?: string;        // YYYY-MM-DD
  to?: string;          // YYYY-MM-DD
};

// Versione “normalizzata” (stringhe vuote -> undefined)
export type NormalizedFilters = Required<Record<keyof SearchFilters, string | undefined>>;

// --- Paginazione ---
export type Paginated<T> = {
  items: T[];
  total: number;
  hasMore: boolean;
};
