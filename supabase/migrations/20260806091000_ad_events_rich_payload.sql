begin;

alter table if exists public.ad_events
  add column if not exists viewer_country text,
  add column if not exists viewer_region text,
  add column if not exists viewer_province text,
  add column if not exists viewer_city text,
  add column if not exists viewer_sport text,
  add column if not exists viewer_audience text,
  add column if not exists viewer_user_id uuid;

create index if not exists ad_events_campaign_id_created_at_idx
  on public.ad_events (campaign_id, created_at);

create index if not exists ad_events_creative_id_created_at_idx
  on public.ad_events (creative_id, created_at);

create index if not exists ad_events_viewer_user_id_created_at_idx
  on public.ad_events (viewer_user_id, created_at);

commit;
