begin;

-- Incomplete/invalid clubs stay active as accounts, but clearing their public name
-- returns them to mandatory onboarding and removes them from public discovery.
-- The first id is the reported "Giacomo" club profile.
update public.profiles
set
  full_name = null,
  display_name = null,
  updated_at = now()
where coalesce(account_type, type) = 'club'
  and (
    id = '52512b39-a46c-4b87-8d50-918fd276646f'::uuid
    or lower(btrim(coalesce(full_name, display_name, ''))) in (
      'club',
      'nessuno',
      'prova',
      'squadra',
      'test'
    )
    or coalesce(full_name, display_name, '') ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or coalesce(full_name, display_name, '') ~* '^https?://'
  );

commit;
