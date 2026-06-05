insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.profiles
  add column if not exists avatar_path text;

alter table public.companies
  add column if not exists avatar_path text;

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
  company_data.company_country_flag_url,
  p.avatar_path
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

create or replace view public.company_members_with_scores as
select
  cm.company_id,
  cm.user_id,
  coalesce(p.display_name, p.username) as username,
  p.avatar_url,
  coalesce(us.total_points, 0) as total_points,
  coalesce(us.exact_count, 0) as exact_count,
  cm.joined_at,
  p.avatar_path
from public.company_members cm
join public.profiles p on p.id = cm.user_id
left join public.user_scores us on us.user_id = cm.user_id;

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
  profile.company_country_flag_url as country_flag_url,
  profile.avatar_path
from public.current_user_profile profile;

create or replace view public.current_user_tribes as
select
  cm.company_id as tribe_id,
  c.name as tribe_name,
  c.country_team_id is not null as is_country_tribe,
  cm.joined_at,
  t.flag_url as country_flag_url,
  c.avatar_path
from public.company_members cm
join public.companies c on c.id = cm.company_id
left join public.teams t on t.id = c.country_team_id
where cm.user_id = auth.uid();

create or replace view public.tribe_members_with_scores as
select
  member.company_id as tribe_id,
  member.user_id,
  member.username,
  member.avatar_url,
  member.total_points,
  member.exact_count,
  member.joined_at,
  member.avatar_path
from public.company_members_with_scores member;

create or replace view public.tribe_invite_info as
select
  invite.company_id as tribe_id,
  invite.company_name as tribe_name,
  invite.invite_code,
  invite.member_count,
  c.country_team_id is not null as is_country_tribe,
  t.flag_url as country_flag_url,
  c.avatar_path
from public.company_invite_info invite
join public.companies c on c.id = invite.company_id
left join public.teams t on t.id = c.country_team_id;

drop function if exists public.get_global_leaderboard();

create or replace function public.get_global_leaderboard()
returns table (
  rank bigint,
  user_id uuid,
  username text,
  total_points bigint,
  exact_count bigint,
  avatar_path text
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
    coalesce(p.display_name, p.username) as username,
    coalesce(us.total_points, 0)::bigint as total_points,
    coalesce(us.exact_count, 0)::bigint as exact_count,
    p.avatar_path
  from public.profiles p
  left join public.user_scores us on us.user_id = p.id
  order by rank;
$$;

drop function if exists public.get_company_leaderboard(uuid);

create or replace function public.get_company_leaderboard(p_company_id uuid)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  total_points bigint,
  exact_count bigint,
  avatar_path text
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
    coalesce(p.display_name, p.username) as username,
    coalesce(us.total_points, 0)::bigint as total_points,
    coalesce(us.exact_count, 0)::bigint as exact_count,
    p.avatar_path
  from public.company_members cm
  join public.profiles p on p.id = cm.user_id
  left join public.user_scores us on us.user_id = p.id
  where cm.company_id = p_company_id
  order by rank;
$$;

drop function if exists public.get_tribes_leaderboard_with_flags();

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
  country_flag_url text,
  avatar_path text
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
    t.flag_url as country_flag_url,
    c.avatar_path
  from public.companies c
  left join public.company_scores cs on cs.company_id = c.id
  left join public.teams t on t.id = c.country_team_id
  where coalesce(cs.member_count, 0) > 0
  order by rank;
$$;

create or replace function public.get_user_profile()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total_points', coalesce(us.total_points, 0),
    'exact_count', coalesce(us.exact_count, 0),
    'total_predictions', (select count(*) from public.predictions where user_id = auth.uid()),
    'rank', (select rank from public.user_ranked ur where ur.user_id = p.id),
    'favorite_team_id', p.favorite_team_id,
    'favorite_team_code', t.code,
    'favorite_team_name', coalesce(t.name_fr, t.name),
    'favorite_team_flag', t.flag_url,
    'username', p.username,
    'display_name', coalesce(p.display_name, p.username),
    'boosts_available', p.boosts_available,
    'avatar_path', p.avatar_path
  )
  from public.profiles p
  left join public.user_scores us on us.user_id = p.id
  left join public.teams t on t.id = p.favorite_team_id
  where p.id = auth.uid();
$$;

grant select on public.current_user_profile to authenticated;
grant select on public.company_members_with_scores to authenticated;
grant select on public.current_user_tribe to authenticated;
grant select on public.current_user_tribes to authenticated;
grant select on public.tribe_members_with_scores to authenticated;
grant select on public.tribe_invite_info to authenticated;

grant execute on function public.get_global_leaderboard() to authenticated;
grant execute on function public.get_company_leaderboard(uuid) to authenticated;
grant execute on function public.get_my_company_leaderboard() to authenticated;
grant execute on function public.get_my_tribe_leaderboard() to authenticated;
grant execute on function public.get_tribes_leaderboard_with_flags() to authenticated;
grant execute on function public.get_user_profile() to authenticated;
