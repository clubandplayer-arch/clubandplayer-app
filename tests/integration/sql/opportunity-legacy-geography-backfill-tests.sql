do $$
begin
 if (select geo_area_id from public.opportunities where title='Exact Subiaco') <> '20000000-0000-0000-0000-000000000003' then raise exception 'exact hierarchy not backfilled'; end if;
 if (select country_id from public.opportunities where title='Ambiguous') <> '10000000-0000-0000-0000-000000000001' or (select geo_area_id from public.opportunities where title='Ambiguous') is not null then raise exception 'ambiguous must be country-only'; end if;
 if (select country_id from public.opportunities where title='Unresolved') <> '10000000-0000-0000-0000-000000000001' or (select geo_area_id from public.opportunities where title='Unresolved') is not null then raise exception 'unresolved must be country-only'; end if;
 if (select country_id from public.opportunities where title='Foreign') is not null then raise exception 'foreign legacy row changed'; end if;
 if (select province from public.opportunities where title='Exact Subiaco') <> 'RM' then raise exception 'legacy text changed'; end if;
 if (select count(*) from public.applications) <> 1 then raise exception 'applications changed'; end if;
 if (select owner_id from public.opportunities where title='Exact Subiaco') <> '40000000-0000-0000-0000-000000000001' then raise exception 'ownership changed'; end if;
end $$;
select 'C7_OPPORTUNITY_BACKFILL_RUNTIME_PASS';
