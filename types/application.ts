export type ApplicationStatus = 'submitted' | 'seen' | 'accepted' | 'rejected';

export type Application = {
  id: string;
  opportunity_id: string;
  athlete_id: string;            // <-- rinominato
  club_id?: string | null;
  note?: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
};
