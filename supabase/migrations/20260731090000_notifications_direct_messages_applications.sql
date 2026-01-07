begin;

create or replace function public.safe_insert_notification(
  p_recipient_profile_id uuid,
  p_recipient_user_id uuid,
  p_actor_profile_id uuid,
  p_kind text,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_user_id uuid;
begin
  if p_recipient_user_id is not null then
    target_user_id := p_recipient_user_id;
  elsif p_recipient_profile_id is not null then
    select user_id
      into target_user_id
      from public.profiles
      where id = p_recipient_profile_id
      limit 1;
  end if;

  if target_user_id is null then
    return;
  end if;

  insert into public.notifications (
    id,
    user_id,
    recipient_profile_id,
    actor_profile_id,
    kind,
    payload,
    read
  )
  values (
    gen_random_uuid(),
    target_user_id,
    p_recipient_profile_id,
    p_actor_profile_id,
    p_kind,
    p_payload,
    false
  );
exception
  when others then
    return;
end;
$$;

create or replace function public.notify_on_direct_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.safe_insert_notification(
    new.recipient_profile_id,
    null,
    new.sender_profile_id,
    'new_message',
    jsonb_build_object(
      'message_id', new.id,
      'sender_profile_id', new.sender_profile_id,
      'recipient_profile_id', new.recipient_profile_id,
      'preview', left(coalesce(new.content, ''), 140)
    )
  );
  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists trg_notify_on_direct_message on public.direct_messages;
create trigger trg_notify_on_direct_message
after insert on public.direct_messages
for each row
execute function public.notify_on_direct_message();

create or replace function public.notify_on_application_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  recipient_profile uuid;
  actor_profile uuid;
  opp_title text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status not in ('accepted', 'rejected') then
    return new;
  end if;

  select id into recipient_profile
  from public.profiles
  where user_id = new.athlete_id
  limit 1;

  select id into actor_profile
  from public.profiles
  where user_id = new.club_id
  limit 1;

  select title into opp_title
  from public.opportunities
  where id = new.opportunity_id
  limit 1;

  perform public.safe_insert_notification(
    recipient_profile,
    new.athlete_id,
    actor_profile,
    'application_status',
    jsonb_build_object(
      'application_id', new.id,
      'opportunity_id', new.opportunity_id,
      'opportunity_title', opp_title,
      'status', new.status
    )
  );

  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists trg_notify_on_application_status on public.applications;
create trigger trg_notify_on_application_status
after update on public.applications
for each row
execute function public.notify_on_application_status();

commit;
