-- Ensure club stadium location fields exist for profile stadium map integration
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS club_stadium text,
  ADD COLUMN IF NOT EXISTS club_stadium_address text,
  ADD COLUMN IF NOT EXISTS club_stadium_lat double precision,
  ADD COLUMN IF NOT EXISTS club_stadium_lng double precision;
