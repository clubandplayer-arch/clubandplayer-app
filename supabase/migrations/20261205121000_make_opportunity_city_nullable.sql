begin;

-- Canonical geography supports country-only and intermediate-area Opportunities.
-- Their legacy projection has no city, so the compatibility column must be nullable.
alter table public.opportunities
  alter column city drop not null;

commit;
