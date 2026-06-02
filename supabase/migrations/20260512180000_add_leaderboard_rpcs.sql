create or replace function public.get_global_leaderboard()
returns table (
  rank bigint,
  user_id uuid,
  username text,
  total_points bigint,
  exact_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    row_number() over (
      order by
        coalesce(us.total_points, 0) desc,
        coalesce(us.exact_count, 0) desc,
        p.id asc
    ) as rank,
    p.id as user_id,
    p.username,
    coalesce(us.total_points, 0)::bigint as total_points,
    coalesce(us.exact_count, 0)::bigint as exact_count
  from public.profiles p
  left join public.user_scores us on us.user_id = p.id
  order by rank;
$$;

create or replace function public.get_company_leaderboard(p_company_id uuid)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  total_points bigint,
  exact_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    row_number() over (
      order by
        coalesce(us.total_points, 0) desc,
        coalesce(us.exact_count, 0) desc,
        p.id asc
    ) as rank,
    p.id as user_id,
    p.username,
    coalesce(us.total_points, 0)::bigint as total_points,
    coalesce(us.exact_count, 0)::bigint as exact_count
  from public.company_members cm
  join public.profiles p on p.id = cm.user_id
  left join public.user_scores us on us.user_id = p.id
  where cm.company_id = p_company_id
  order by rank;
$$;

create or replace function public.get_companies_leaderboard()
returns table (
  rank bigint,
  company_id uuid,
  name text,
  member_count bigint,
  active_member_count bigint,
  avg_points numeric,
  total_points bigint
)
language sql
security definer
set search_path = public
as $$
  select
    row_number() over (
      order by
        coalesce(cs.avg_points, 0) desc,
        c.id asc
    ) as rank,
    c.id as company_id,
    c.name,
    coalesce(cs.member_count, 0)::bigint as member_count,
    coalesce(cs.active_member_count, 0)::bigint as active_member_count,
    coalesce(cs.avg_points, 0) as avg_points,
    coalesce(cs.total_points, 0)::bigint as total_points
  from public.companies c
  left join public.company_scores cs on cs.company_id = c.id
  order by rank;
$$;

revoke all on function public.get_global_leaderboard() from public;

revoke all on function public.get_company_leaderboard(uuid) from public;

revoke all on function public.get_companies_leaderboard() from public;

grant execute on function public.get_global_leaderboard() to authenticated;

grant execute on function public.get_company_leaderboard(uuid) to authenticated;

grant execute on function public.get_companies_leaderboard() to authenticated;
