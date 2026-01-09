begin;

alter table if exists public.ad_campaigns
  add column if not exists customer_name text,
  add column if not exists customer_contact text,
  add column if not exists notes text;

commit;
