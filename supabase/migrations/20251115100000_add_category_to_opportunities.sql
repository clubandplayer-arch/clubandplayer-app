-- Add optional category/level to opportunities
alter table if exists public.opportunities
  add column if not exists category text;

-- Keep existing RLS policies; index for filtering
create index if not exists opportunities_category_idx
  on public.opportunities(category);
