// types/club.ts
export type Club = {
  id: string;
  name: string;
  display_name?: string | null;
  displayName?: string | null;
  city: string | null;
  country: string | null;
  province?: string | null;
  region?: string | null;
  status?: string | null;
  level: 'pro' | 'semi-pro' | 'amateur' | null;
  logo_url: string | null;
  logoUrl?: string | null;
  bio?: string | null;
  owner_id?: string | null;
  ownerId?: string | null;
  created_at: string;
  createdAt?: string;
  updated_at?: string | null;
  updatedAt?: string | null;
};

export type ClubsApiResponse = {
  data: Club[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  q: string;
  pagination?: { limit: number; offset: number };
};
