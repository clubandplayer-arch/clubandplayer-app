-- Supabase Data API hardening (April/May 2026): new projects and reset
-- databases no longer automatically expose public tables to PostgREST/GraphQL.
-- Grant API privileges only to tables that already have RLS enabled, so row
-- policies remain the source of truth and non-RLS internal tables stay private.

do $$
declare
  api_table regclass;
begin
  for api_table in
    select c.oid::regclass
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relrowsecurity
  loop
    execute format('grant select on table %s to anon', api_table);
    execute format('grant select, insert, update, delete on table %s to authenticated, service_role', api_table);
  end loop;
end $$;

-- grouped_push_queue is an internal server-side queue without RLS. Keep it
-- inaccessible to anon/authenticated Data API clients, but allow the admin
-- service-role workers that enqueue and flush grouped push notifications.
grant select, insert, update, delete on table public.grouped_push_queue to service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;
