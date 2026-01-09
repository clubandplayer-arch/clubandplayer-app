begin;

alter table if exists public.ad_targets
  add column if not exists province text;

create index if not exists ad_targets_campaign_id_province_idx
  on public.ad_targets (campaign_id, province);

commit;
