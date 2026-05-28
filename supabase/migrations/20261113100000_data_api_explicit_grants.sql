-- Supabase Data API hardening (April/May 2026): new projects and reset
-- databases no longer automatically expose public tables to PostgREST/GraphQL.
-- Keep the existing application contract by making Data API access explicit for
-- all public tables created by earlier migrations. RLS policies remain the
-- row-level source of truth for what each role can actually access.

grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;
