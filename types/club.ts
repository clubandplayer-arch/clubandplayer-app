// types/club.ts
export type Club = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  level: 'pro' | 'semi-pro' | 'amateur' | null;
  logo_url: string | null;
  created_at: string;
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
