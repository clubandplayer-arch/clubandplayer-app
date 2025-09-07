export type ApplicationStatus = 'submitted' | 'seen' | 'accepted' | 'rejected';

export type Application = {
  id: string;
  opportunity_id: string;
  applicant_id: string;
  note?: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
};
