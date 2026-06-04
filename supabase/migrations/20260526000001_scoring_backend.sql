-- 1. set_match_result : admin / système pour saisir le score réel d'un match
create or replace function public.set_match_result(
  p_match_id uuid,
  p_home_score integer,
  p_away_score integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_home_score is null or p_away_score is null
     or p_home_score < 0 or p_home_score > 99
     or p_away_score < 0 or p_away_score > 99 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_SCORE',
      'message', 'Les scores doivent être des entiers entre 0 et 99.'
    );
  end if;

  insert into public.match_results (match_id, home_score, away_score)
  values (p_match_id, p_home_score, p_away_score)
  on conflict (match_id) do update
    set home_score = excluded.home_score,
        away_score = excluded.away_score;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.set_match_result(uuid, integer, integer) to authenticated;

-- 2. user_ranked : vue avec rang calculé via dense_rank
create or replace view public.user_ranked as
select
  us.user_id,
  us.total_points,
  us.exact_count,
  dense_rank() over (order by us.total_points desc, us.exact_count desc) as rank
from public.user_scores us;

grant select on public.user_ranked to authenticated;

-- 2. get_user_profile : points, rang, équipe favorite de l'utilisateur connecté
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
    'favorite_team_name', t.name,
    'favorite_team_flag', t.flag_url,
    'username', p.username
  )
  from public.profiles p
  left join public.user_scores us on us.user_id = p.id
  left join public.teams t on t.id = p.favorite_team_id
  where p.id = auth.uid();
$$;

grant execute on function public.get_user_profile() to authenticated;

-- 3. user_ranked : vue avec rang calculé via dense_rank
create or replace view public.user_ranked as
select
  us.user_id,
  us.total_points,
  us.exact_count,
  dense_rank() over (order by us.total_points desc, us.exact_count desc) as rank
from public.user_scores us;

grant select on public.user_ranked to authenticated;

-- 4. get_match_list enrichie : ajoute points_earned par prédiction
drop function if exists public.get_match_list() cascade;

create or replace function public.get_match_list()
returns table (
  match_id uuid,
  home_team_name text,
  home_team_code text,
  home_team_flag text,
  away_team_name text,
  away_team_code text,
  away_team_flag text,
  kickoff_at timestamptz,
  stage text,
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
    ht.name,
    ht.code,
    ht.flag_url,
    at.name,
    at.code,
    at.flag_url,
    m.kickoff_at,
    m.stage,
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
