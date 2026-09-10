create schema supabase_migrations;
create table supabase_migrations.schema_migrations (
  version text primary key
);
insert into supabase_migrations.schema_migrations(version) values ('20261206120000');
