create or replace function public.get_prediction_progress()
returns table (
  predicted_matches bigint,
  total_matches bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (
      select count(distinct p.match_id)
      from public.predictions p
      join public.matches m on m.id = p.match_id
      where p.user_id = auth.uid()
    )::bigint as predicted_matches,
    (
      select count(*)
      from public.matches
    )::bigint as total_matches;
$$;

grant execute on function public.get_prediction_progress() to authenticated;
