drop function if exists public.get_match_list();

create or replace function public.get_match_list()
returns table (
  match_id uuid,
  fifa_match_number integer,
  home_team_name text,
  home_team_code text,
  home_team_flag text,
  away_team_name text,
  away_team_code text,
  away_team_flag text,
  kickoff_at timestamptz,
  stage text,
  group_name text,
  venue_city text,
  venue_stadium text,
  venue_country text,
  local_kickoff_time text,
  local_timezone text,
  status text,
  user_home_score integer,
  user_away_score integer,
  user_is_boosted boolean,
  result_home_score integer,
  result_away_score integer,
  points_earned integer
)
language sql
security definer
set search_path = public
as $$
  select
    m.id,
    m.fifa_match_number,
    coalesce(ht.name_fr, ht.name),
    ht.code,
    ht.flag_url,
    coalesce(at.name_fr, at.name),
    at.code,
    at.flag_url,
    m.kickoff_at,
    m.stage,
    m.group_name,
    m.venue_city,
    m.venue_stadium,
    m.venue_country,
    m.local_kickoff_time,
    m.local_timezone,
    m.status,
    p.home_score,
    p.away_score,
    p.is_boosted,
    mr.home_score,
    mr.away_score,
    case
      when mr.home_score is not null and p.home_score is not null then
        (case
          when mr.home_score = p.home_score and mr.away_score = p.away_score then 5
          when sign(mr.home_score - mr.away_score) = sign(p.home_score - p.away_score) then 2
          else 0
        end * case when p.is_boosted then 2 else 1 end)
    end
  from public.matches_with_status m
  join public.teams ht on ht.id = m.home_team_id
  join public.teams at on at.id = m.away_team_id
  left join public.predictions p
    on p.match_id = m.id
   and p.user_id = auth.uid()
  left join public.match_results mr on mr.match_id = m.id
  order by m.kickoff_at asc;
$$;

grant execute on function public.get_match_list() to authenticated;

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
    'username', p.username
  )
  from public.profiles p
  left join public.user_scores us on us.user_id = p.id
  left join public.teams t on t.id = p.favorite_team_id
  where p.id = auth.uid();
$$;

grant execute on function public.get_user_profile() to authenticated;

create or replace function public.set_favorite_team(p_team_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_team_name text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return jsonb_build_object('success', false, 'error_code', 'NOT_AUTHENTICATED', 'message', 'Utilisateur non connecté.');
  end if;

  if p_team_id is not null then
    select coalesce(name_fr, name) into v_team_name from public.teams where id = p_team_id;
    if v_team_name is null then
      return jsonb_build_object('success', false, 'error_code', 'TEAM_NOT_FOUND', 'message', 'Équipe introuvable.');
    end if;
  end if;

  update public.profiles
  set favorite_team_id = p_team_id
  where id = v_user_id;

  return jsonb_build_object('success', true, 'data', jsonb_build_object('team_id', p_team_id, 'team_name', v_team_name));
end;
$$;

grant execute on function public.set_favorite_team(uuid) to authenticated;
