do $$
begin
  if (select count(*) from public.opportunities where country_id = '10000000-0000-0000-0000-000000000001' and geo_area_id = '20000000-0000-0000-0000-000000000003') <> 31 then raise exception 'production gate did not update exactly 31 Municipalities'; end if;
  if exists (select 1 from public.opportunities where country not in ('IT','Italia','Italy') or region <> 'Lazio' or province <> 'RM' or city <> 'Subiaco') then raise exception 'production gate changed legacy text'; end if;
  if exists (select 1 from public.opportunities where owner_id <> '40000000-0000-0000-0000-000000000001' or created_by <> owner_id or club_id <> owner_id) then raise exception 'production gate changed ownership'; end if;
  if (select count(*) from public.applications) <> 1 then raise exception 'production gate changed applications'; end if;
end $$;
select 'C7_PRODUCTION_FAIL_CLOSED_GATE_PASS';
