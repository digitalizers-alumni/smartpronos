alter table public.profiles
  add column if not exists boosts_available integer not null default 3;

alter table public.profiles
  drop constraint if exists profiles_boosts_available_non_negative;

alter table public.profiles
  add constraint profiles_boosts_available_non_negative check (boosts_available >= 0);

drop index if exists public.one_boost_per_user;

create or replace function public.upsert_prediction(
  p_match_id uuid,
  p_home_score integer,
  p_away_score integer,
  p_is_boosted boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_kickoff_at timestamptz;
  v_prediction public.predictions%rowtype;
  v_previous_boost boolean := false;
  v_next_boost boolean := coalesce(p_is_boosted, false);
  v_boosts_available integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'NOT_AUTHENTICATED',
      'message', 'Utilisateur non connecté.'
    );
  end if;

  if p_home_score is null
     or p_away_score is null
     or p_home_score < 0
     or p_home_score > 99
     or p_away_score < 0
     or p_away_score > 99 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_SCORE',
      'message', 'Les scores doivent être des entiers entre 0 et 99.'
    );
  end if;

  select m.kickoff_at
  into v_kickoff_at
  from public.matches m
  where m.id = p_match_id;

  if v_kickoff_at is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'MATCH_NOT_FOUND',
      'message', 'Match introuvable.'
    );
  end if;

  if now() >= v_kickoff_at - interval '15 minutes' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'MATCH_LOCKED',
      'message', 'Le match est verrouillé.'
    );
  end if;

  select p.boosts_available
  into v_boosts_available
  from public.profiles p
  where p.id = v_user_id
  for update;

  if v_boosts_available is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'PROFILE_NOT_FOUND',
      'message', 'Profil introuvable.'
    );
  end if;

  select p.*
  into v_prediction
  from public.predictions p
  where p.user_id = v_user_id
    and p.match_id = p_match_id
  for update;

  v_previous_boost := coalesce(v_prediction.is_boosted, false);

  if v_next_boost and not v_previous_boost then
    if v_boosts_available <= 0 then
      return jsonb_build_object(
        'success', false,
        'error_code', 'NO_BOOST_AVAILABLE',
        'message', 'Tu n’as plus de boost disponible.'
      );
    end if;

    update public.profiles
    set boosts_available = boosts_available - 1
    where id = v_user_id
    returning boosts_available into v_boosts_available;
  elsif not v_next_boost and v_previous_boost then
    update public.profiles
    set boosts_available = boosts_available + 1
    where id = v_user_id
    returning boosts_available into v_boosts_available;
  end if;

  insert into public.predictions (
    user_id,
    match_id,
    home_score,
    away_score,
    is_boosted
  )
  values (
    v_user_id,
    p_match_id,
    p_home_score,
    p_away_score,
    v_next_boost
  )
  on conflict (user_id, match_id) do update
    set home_score = excluded.home_score,
        away_score = excluded.away_score,
        is_boosted = excluded.is_boosted
  returning *
  into v_prediction;

  return jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'prediction_id', v_prediction.id,
      'match_id', v_prediction.match_id,
      'home_score', v_prediction.home_score,
      'away_score', v_prediction.away_score,
      'is_boosted', v_prediction.is_boosted,
      'boosts_available', v_boosts_available,
      'updated_at', v_prediction.updated_at
    )
  );
end;
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
    'boosts_available', p.boosts_available
  )
  from public.profiles p
  left join public.user_scores us on us.user_id = p.id
  left join public.teams t on t.id = p.favorite_team_id
  where p.id = auth.uid();
$$;

grant execute on function public.upsert_prediction(uuid, integer, integer, boolean) to authenticated;
grant execute on function public.get_user_profile() to authenticated;
