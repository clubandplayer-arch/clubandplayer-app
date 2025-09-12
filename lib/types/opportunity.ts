// types/opportunity.ts
export type Gender = 'uomo' | 'donna' | 'mixed';

export interface Opportunity {
  id: string;
  title: string;
  description?: string | null;

  country?: string | null;
  region?: string | null;
  province?: string | null;
  city?: string | null;

  sport?: string | null;
  role?: string | null;
  age?: string | null;

  // nuovo campo obbligatorio lato UI (default db = 'mixed')
  gender: Gender;

  owner_id?: string | null;
  created_at?: string;
  club_name?: string | null; // se esiste ancora in tabella lo lasciamo come opzionale
}

export interface OpportunitiesApiResponse {
  data: Opportunity[];
  page: number;
  pageSize: number;
  total: number;
}
