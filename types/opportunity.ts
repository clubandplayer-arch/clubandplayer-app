// types/opportunity.ts
export type Opportunity = {
  id: string;
  title: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
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
