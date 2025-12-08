export type ProfileLinks = {
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  x?: string | null;
  linkedin?: string | null;
} | null;

export type ProfileSkill = {
  name: string;
  endorsementsCount: number;
  endorsedByMe: boolean;
};

export type Profile = {
  user_id: string;
  type?: 'athlete' | 'club' | null;
  account_type?: 'athlete' | 'club' | null;
  display_name: string;
  status?: 'pending' | 'active' | 'rejected' | null;
  headline?: string | null;
  bio?: string | null;
  country?: string | null;
  region?: string | null;
  province?: string | null;
  city?: string | null;
  sport?: string | null;
  role?: string | null;
  matches_played?: number | null;
  goals_scored?: number | null;
  assists?: number | null;
  open_to_opportunities?: boolean | null;
  preferred_roles?: string | null;
  preferred_locations?: string | null;
  links?: ProfileLinks;
  skills?: ProfileSkill[] | null;
  avatar_url?: string | null;
  club_motto?: string | null;
  onboarding_dismiss_count?: number | null;
  created_at: string;
  updated_at: string;
};
