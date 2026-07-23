-- Run fan vote count lookups with the querying user's privileges so Supabase
-- does not flag the public view as SECURITY DEFINER.
alter view if exists public.current_player_fan_vote_counts
  set (security_invoker = true);
