create or replace function public.get_public_profile(p_user_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'display_name', coalesce(p.display_name, p.username),
    'avatar_path', p.avatar_path,
    'total_points', coalesce(us.total_points, 0),
    'exact_count', coalesce(us.exact_count, 0),
    'total_predictions', (select count(*) from public.predictions where user_id = p.id),
    'rank', (select rank from public.user_ranked ur where ur.user_id = p.id),
    'favorite_team_id', p.favorite_team_id,
    'favorite_team_code', t.code,
    'favorite_team_name', coalesce(t.name_fr, t.name),
    'favorite_team_flag', t.flag_url
  )
  from public.profiles p
  left join public.user_scores us on us.user_id = p.id
  left join public.teams t on t.id = p.favorite_team_id
  where p.id = p_user_id;
$$;

create or replace function public.get_public_tribe(p_tribe_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with tribe as (
    select
      c.id,
      c.name,
      c.avatar_path,
      c.country_team_id,
      t.flag_url as country_flag_url,
      c.country_team_id is not null as is_country_tribe
    from public.companies c
    left join public.teams t on t.id = c.country_team_id
    where c.id = p_tribe_id
  ),
  score as (
    select
      cs.member_count,
      cs.active_member_count,
      cs.avg_points,
      cs.total_points
    from public.company_scores cs
    where cs.company_id = p_tribe_id
  ),
  rank_data as (
    select board.rank
    from public.get_tribes_leaderboard_with_flags() board
    where board.tribe_id = p_tribe_id
  ),
  members as (
    select jsonb_agg(
      jsonb_build_object(
        'rank', ranked.rank,
        'user_id', ranked.user_id,
        'username', ranked.username,
        'avatar_path', ranked.avatar_path,
        'total_points', ranked.total_points,
        'exact_count', ranked.exact_count
      )
      order by ranked.rank
    ) as data
    from (
      select
        row_number() over (
          order by
            coalesce(us.total_points, 0) desc,
            coalesce(us.exact_count, 0) desc,
            p.id asc
        ) as rank,
        p.id as user_id,
        coalesce(p.display_name, p.username) as username,
        p.avatar_path,
        coalesce(us.total_points, 0)::bigint as total_points,
        coalesce(us.exact_count, 0)::bigint as exact_count
      from public.company_members cm
      join public.profiles p on p.id = cm.user_id
      left join public.user_scores us on us.user_id = p.id
      where cm.company_id = p_tribe_id
    ) ranked
  )
  select jsonb_build_object(
    'id', tribe.id,
    'name', tribe.name,
    'avatar_path', tribe.avatar_path,
    'is_country_tribe', tribe.is_country_tribe,
    'country_flag_url', tribe.country_flag_url,
    'rank', rank_data.rank,
    'member_count', coalesce(score.member_count, 0),
    'active_member_count', coalesce(score.active_member_count, 0),
    'avg_points', coalesce(score.avg_points, 0),
    'total_points', coalesce(score.total_points, 0),
    'members', coalesce(members.data, jsonb_build_array())
  )
  from tribe
  left join score on true
  left join rank_data on true
  left join members on true;
$$;

revoke all on function public.get_public_profile(uuid) from public;
revoke all on function public.get_public_tribe(uuid) from public;

grant execute on function public.get_public_profile(uuid) to authenticated;
grant execute on function public.get_public_tribe(uuid) to authenticated;
