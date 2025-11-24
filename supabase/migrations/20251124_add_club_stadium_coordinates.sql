-- Campi per geolocalizzare stadio/impianto dei club tramite Google Maps
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS club_stadium_address text,
  ADD COLUMN IF NOT EXISTS club_stadium_lat double precision,
  ADD COLUMN IF NOT EXISTS club_stadium_lng double precision;
