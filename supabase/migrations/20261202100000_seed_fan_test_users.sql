-- Crea le utenze Fan di test anche in auth.users/auth.identities.
-- Inserire solo in public.profiles non basta: il login Supabase controlla auth.users.

do $$
declare
  test_user record;
begin
  for test_user in
    select * from (values
      ('4aa1e09c-6cf1-4d45-9fd7-5b746cd0c201'::uuid, 'Mario Rossi', 'rossi@test.it', 'rossi1111'),
      ('8d2b3bbd-9185-4b2c-9b26-91b60c02bc02'::uuid, 'Luigi Bianchi', 'bianchi@test.it', 'bianchi1111'),
      ('e89d88ed-3593-43ef-b6bb-9513fa63c303'::uuid, 'Roberto Bello', 'bello@test.it', 'bello1111'),
      ('5e690491-69bf-41d7-94f9-18ca43854904'::uuid, 'Andrea Porto', 'porto@test.it', 'porto1111'),
      ('ce64ba6e-8db2-4db7-9284-40c42b9eb505'::uuid, 'Luciano Servi', 'servi@test.it', 'servi1111')
    ) as users(id, full_name, email, password)
  loop
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      test_user.id,
      'authenticated',
      'authenticated',
      test_user.email,
      crypt(test_user.password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'account_type', 'fan',
        'type', 'fan',
        'role', 'fan',
        'full_name', test_user.full_name,
        'display_name', test_user.full_name,
        'name', test_user.full_name
      ),
      now(),
      now()
    )
    on conflict (id) do update set
      aud = excluded.aud,
      role = excluded.role,
      email = excluded.email,
      encrypted_password = excluded.encrypted_password,
      email_confirmed_at = coalesce(auth.users.email_confirmed_at, excluded.email_confirmed_at),
      raw_app_meta_data = excluded.raw_app_meta_data,
      raw_user_meta_data = excluded.raw_user_meta_data,
      updated_at = now();

    insert into auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      test_user.id,
      test_user.id,
      test_user.id::text,
      jsonb_build_object(
        'sub', test_user.id::text,
        'email', test_user.email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now()
    )
    on conflict (provider, provider_id) do update set
      user_id = excluded.user_id,
      identity_data = excluded.identity_data,
      updated_at = now();

    insert into public.profiles (
      id,
      user_id,
      email,
      account_type,
      type,
      status,
      display_name,
      full_name,
      headline,
      country,
      role,
      is_admin,
      created_at,
      updated_at
    ) values (
      test_user.id,
      test_user.id,
      test_user.email,
      'fan',
      'fan',
      'active',
      test_user.full_name,
      test_user.full_name,
      'Fan demo per QA',
      'IT',
      'Fan',
      false,
      now(),
      now()
    )
    on conflict (id) do update set
      user_id = excluded.user_id,
      email = excluded.email,
      account_type = excluded.account_type,
      type = excluded.type,
      status = excluded.status,
      display_name = excluded.display_name,
      full_name = excluded.full_name,
      headline = excluded.headline,
      country = excluded.country,
      role = excluded.role,
      is_admin = false,
      updated_at = now();
  end loop;
end $$;
