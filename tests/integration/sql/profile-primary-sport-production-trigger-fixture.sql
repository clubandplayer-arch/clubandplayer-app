\set ON_ERROR_STOP on

-- Semantic stubs for the five Production-only triggers absent from the
-- versioned four-trigger fixture. Names/timing are representative; function
-- bodies are intentionally minimal and are not claimed to mirror Production.
create function public.test_profile_passthrough() returns trigger
language plpgsql as $$ begin return new; end $$;

create function public.test_profile_touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;

create trigger enforce_single_platform_admin_profile
before insert or update on public.profiles for each row execute function public.test_profile_passthrough();
create trigger set_updated_at
before update on public.profiles for each row execute function public.test_profile_touch_updated_at();
create trigger trg_profiles_fill_default_role
before insert or update on public.profiles for each row execute function public.test_profile_passthrough();
create trigger trg_profiles_fill_role_for_fan
before insert or update on public.profiles for each row execute function public.test_profile_passthrough();
create trigger trg_profiles_updated_at
before update on public.profiles for each row execute function public.test_profile_touch_updated_at();

