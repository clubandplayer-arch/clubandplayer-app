-- Scalability P0 indexes for launch spikes.
-- Adds search indexes for wildcard lookups, safer application idempotency,
-- and hot-path indexes for feed blocks and unread notifications.

create extension if not exists pg_trgm with schema extensions;

create index if not exists opportunities_title_trgm_idx
  on public.opportunities using gin (title gin_trgm_ops);

create index if not exists opportunities_city_trgm_idx
  on public.opportunities using gin (city gin_trgm_ops);

create index if not exists opportunities_club_name_trgm_idx
  on public.opportunities using gin (club_name gin_trgm_ops);

create index if not exists clubs_name_trgm_idx
  on public.clubs using gin (name gin_trgm_ops);

create index if not exists clubs_display_name_trgm_idx
  on public.clubs using gin (display_name gin_trgm_ops);

create index if not exists clubs_city_trgm_idx
  on public.clubs using gin (city gin_trgm_ops);

create index if not exists registry_master_denominazione_trgm_idx
  on public.registry_clubs_master using gin (denominazione gin_trgm_ops);

create index if not exists registry_master_sport_normalizzati_trgm_idx
  on public.registry_clubs_master using gin (sport_normalizzati gin_trgm_ops);

create unique index if not exists applications_unique_opportunity_athlete_idx
  on public.applications (opportunity_id, athlete_id);

create index if not exists notifications_user_unread_created_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

create index if not exists posts_author_created_at_idx
  on public.posts (author_id, created_at desc);

create index if not exists profile_blocks_blocker_blocked_idx
  on public.profile_blocks (blocker_profile_id, blocked_profile_id);
