select test.assert(
  not has_function_privilege(
    'authenticated',
    'public.update_my_profile_residence(uuid,uuid)',
    'EXECUTE'
  ),
  'authenticated execute remains disabled after RPC installation'
);

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false);

do $$
begin
  perform public.update_my_profile_residence(null, null);
  raise exception 'disabled RPC unexpectedly executed';
exception
  when insufficient_privilege then null;
end;
$$;

reset role;
