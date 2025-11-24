export type ProfileLinks = {
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  x?: string | null;
  linkedin?: string | null;
} | null;

export type Profile = {
  user_id: string;
  type: 'athlete' | 'club';
  display_name: string;
  headline?: string | null;
  bio?: string | null;
  country?: string | null;
  region?: string | null;
  province?: string | null;
  city?: string | null;
  sport?: string | null;
  club_foundation_year?: number | null;
  club_league_category?: string | null;
  club_stadium?: string | null;
  club_stadium_address?: string | null;
  club_stadium_lat?: number | null;
  club_stadium_lng?: number | null;
  links?: ProfileLinks;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
};
