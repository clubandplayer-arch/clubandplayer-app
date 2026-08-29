\set ON_ERROR_STOP on
create or replace function public.notify_profile_demoted_to_draft()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.profile_visibility_status='published' and new.profile_visibility_status='draft' and new.user_id is not null then
  insert into public.notifications(user_id,kind,payload) values(new.user_id,'profile_returned_to_draft',jsonb_build_object('profile_id',new.id));
 end if;
 return new;
end $$;
create trigger trg_profile_location_coerce before insert or update on public.profiles for each row execute function public.profile_location_coerce();
create trigger profiles_sync_names before insert or update on public.profiles for each row execute function public.sync_profile_names();
create trigger profiles_set_visibility_status before insert or update on public.profiles for each row execute function public.set_profile_visibility_status();
create trigger profiles_notify_draft_demotion after update on public.profiles for each row execute function public.notify_profile_demoted_to_draft();
