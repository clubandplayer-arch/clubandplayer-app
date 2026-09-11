-- Test-only stand-in for Supabase-managed schemas used by the empty replay.
-- Never apply this file to a Supabase project.
create schema if not exists extensions;
create extension if not exists pgcrypto;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
create schema if not exists auth;
create table if not exists auth.users(id uuid primary key default gen_random_uuid(), instance_id uuid, aud text, role text, email text, encrypted_password text, email_confirmed_at timestamptz, raw_app_meta_data jsonb default '{}'::jsonb, raw_user_meta_data jsonb default '{}'::jsonb, confirmation_token text, email_change text, email_change_token_new text, recovery_token text, updated_at timestamptz default now(), created_at timestamptz default now());
create table if not exists auth.identities(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id), provider_id text, identity_data jsonb, provider text, last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz, unique(provider,provider_id));
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create or replace function auth.set_config(text,text,boolean) returns text language sql as $$ select $2 $$;
create schema if not exists storage;
create table if not exists storage.buckets(id text primary key,name text,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
create table if not exists storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid,metadata jsonb,created_at timestamptz default now());
create or replace function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
create or replace function auth.role() returns text language sql stable as $$ select 'authenticated'::text $$;
create or replace function auth.email() returns text language sql stable as $$ select null::text $$;
create or replace function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1, '/') $$;
