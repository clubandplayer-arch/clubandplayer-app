export type Opportunity = {
  id: string;
  title: string;
  description: string | null;
  created_by: string | null;
  created_at: string;

  country: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
  sport: string | null;
  role: string | null;
  age_min: number | null;
  age_max: number | null;
  club_name: string | null;
};

export type OpportunitiesApiResponse = {
  data: Opportunity[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  q: string;
  sort: 'recent' | 'oldest';
};
