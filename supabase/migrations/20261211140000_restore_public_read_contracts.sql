begin;

-- Recreated views lose their explicit grants. Keep them security-invoker so
-- profiles RLS, rather than the view owner, remains the visibility boundary.
do $check_views$
declare
  view_name text;
begin
  foreach view_name in array array['players_view', 'athletes_view'] loop
    if to_regclass('public.' || view_name) is null then
      raise exception 'required view public.% is missing', view_name;
    end if;
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = view_name
        and c.relkind = 'v'
        and coalesce(c.reloptions, array[]::text[]) @> array['security_invoker=true']
    ) then
      raise exception 'public.% must remain security_invoker', view_name;
    end if;
  end loop;
end
$check_views$;

grant usage on schema public to anon, authenticated;
grant select on table public.players_view, public.athletes_view to anon, authenticated;

-- Geography is non-personal reference data used by public cascading selectors.
-- RLS stays enabled and exposes only SELECT; no client write policy is added.
alter table public.regions enable row level security;
alter table public.provinces enable row level security;
alter table public.municipalities enable row level security;

drop policy if exists regions_reference_read on public.regions;
create policy regions_reference_read on public.regions for select to anon, authenticated using (true);
drop policy if exists provinces_reference_read on public.provinces;
create policy provinces_reference_read on public.provinces for select to anon, authenticated using (true);
drop policy if exists municipalities_reference_read on public.municipalities;
create policy municipalities_reference_read on public.municipalities for select to anon, authenticated using (true);

grant select on table public.regions, public.provinces, public.municipalities to anon, authenticated;

commit;
notify pgrst, 'reload schema';
