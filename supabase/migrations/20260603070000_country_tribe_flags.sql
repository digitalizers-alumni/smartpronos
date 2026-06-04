create or replace view public.current_user_profile as
select
  p.id,
  p.email,
  p.username,
  p.avatar_url,
  company_data.company_id,
  company_data.company_name,
  coalesce(p.display_name, p.username) as display_name,
  company_data.company_is_country_tribe,
  company_data.company_country_flag_url
from public.profiles p
left join lateral (
  select
    cm.company_id,
    c.name as company_name,
    c.country_team_id is not null as company_is_country_tribe,
    t.flag_url as company_country_flag_url
  from public.company_members cm
  join public.companies c on c.id = cm.company_id
  left join public.teams t on t.id = c.country_team_id
  where cm.user_id = p.id
  order by c.country_team_id is null, cm.joined_at
  limit 1
) company_data on true
where p.id = auth.uid();

create or replace view public.current_user_tribe as
select
  profile.id,
  profile.email,
  profile.username,
  profile.avatar_url,
  profile.company_id as tribe_id,
  profile.company_name as tribe_name,
  profile.display_name,
  profile.company_is_country_tribe as is_country_tribe,
  profile.company_country_flag_url as country_flag_url
from public.current_user_profile profile;

create or replace view public.current_user_tribes as
select
  cm.company_id as tribe_id,
  c.name as tribe_name,
  c.country_team_id is not null as is_country_tribe,
  cm.joined_at,
  t.flag_url as country_flag_url
from public.company_members cm
join public.companies c on c.id = cm.company_id
left join public.teams t on t.id = c.country_team_id
where cm.user_id = auth.uid();

create or replace view public.tribe_invite_info as
select
  invite.company_id as tribe_id,
  invite.company_name as tribe_name,
  invite.invite_code,
  invite.member_count,
  c.country_team_id is not null as is_country_tribe,
  t.flag_url as country_flag_url
from public.company_invite_info invite
join public.companies c on c.id = invite.company_id
left join public.teams t on t.id = c.country_team_id;

create or replace function public.get_tribes_leaderboard_with_flags()
returns table (
  rank bigint,
  tribe_id uuid,
  name text,
  member_count bigint,
  active_member_count bigint,
  avg_points numeric,
  total_points bigint,
  is_country_tribe boolean,
  country_flag_url text
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
    c.id as tribe_id,
    c.name,
    coalesce(cs.member_count, 0)::bigint as member_count,
    coalesce(cs.active_member_count, 0)::bigint as active_member_count,
    coalesce(cs.avg_points, 0) as avg_points,
    coalesce(cs.total_points, 0)::bigint as total_points,
    c.country_team_id is not null as is_country_tribe,
    t.flag_url as country_flag_url
  from public.companies c
  left join public.company_scores cs on cs.company_id = c.id
  left join public.teams t on t.id = c.country_team_id
  where coalesce(cs.member_count, 0) > 0
  order by rank;
$$;

grant select on public.current_user_profile to authenticated;
grant select on public.current_user_tribe to authenticated;
grant select on public.current_user_tribes to authenticated;
grant select on public.tribe_invite_info to authenticated;
grant execute on function public.get_tribes_leaderboard_with_flags() to authenticated;
