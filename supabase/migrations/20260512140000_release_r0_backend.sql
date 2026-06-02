create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique check (length(code) = 3),
  flag_url text
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  home_team_id uuid not null references public.teams(id) on delete restrict,
  away_team_id uuid not null references public.teams(id) on delete restrict,
  kickoff_at timestamptz not null,
  stage text not null,
  created_at timestamptz not null default now(),
  constraint different_teams check (home_team_id <> away_team_id),
  constraint valid_stage check (
    stage in ('group', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final')
  )
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  home_score integer not null check (home_score >= 0 and home_score <= 99),
  away_score integer not null check (away_score >= 0 and away_score <= 99),
  is_boosted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches(id) on delete cascade,
  home_score integer not null check (home_score >= 0),
  away_score integer not null check (away_score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_predictions_user_id
  on public.predictions (user_id);

create index if not exists idx_predictions_match_id
  on public.predictions (match_id);

create index if not exists idx_matches_kickoff_at
  on public.matches (kickoff_at);

create index if not exists idx_matches_home_team_id
  on public.matches (home_team_id);

create index if not exists idx_matches_away_team_id
  on public.matches (away_team_id);

create index if not exists idx_match_results_match_id
  on public.match_results (match_id);

create unique index if not exists one_boost_per_user
  on public.predictions (user_id)
  where is_boosted = true;

drop trigger if exists set_updated_at_predictions on public.predictions;

create trigger set_updated_at_predictions
  before update on public.predictions
  for each row
  execute function extensions.moddatetime(updated_at);

drop trigger if exists set_updated_at_match_results on public.match_results;

create trigger set_updated_at_match_results
  before update on public.match_results
  for each row
  execute function extensions.moddatetime(updated_at);

alter table public.teams enable row level security;

alter table public.matches enable row level security;

alter table public.predictions enable row level security;

alter table public.match_results enable row level security;

grant select on public.teams to authenticated;

grant select on public.matches to authenticated;

grant select, insert, update, delete on public.predictions to authenticated;

grant select on public.match_results to authenticated;

drop policy if exists "teams readable by all" on public.teams;

drop policy if exists "matches readable by all" on public.matches;

drop policy if exists "results readable by all" on public.match_results;

drop policy if exists "users see only their predictions" on public.predictions;

drop policy if exists "users insert their predictions before lock" on public.predictions;

drop policy if exists "users update their predictions before lock" on public.predictions;

drop policy if exists "users delete their predictions before lock" on public.predictions;

create policy "teams readable by all"
  on public.teams for select to authenticated using (true);

create policy "matches readable by all"
  on public.matches for select to authenticated using (true);

create policy "results readable by all"
  on public.match_results for select to authenticated using (true);

create policy "users see only their predictions"
  on public.predictions for select to authenticated
  using (user_id = auth.uid());

create policy "users insert their predictions before lock"
  on public.predictions for insert to authenticated
  with check (
    user_id = auth.uid()
    and now() < (
      select m.kickoff_at - interval '15 minutes'
      from public.matches m
      where m.id = match_id
    )
  );

create policy "users update their predictions before lock"
  on public.predictions for update to authenticated
  using (
    user_id = auth.uid()
    and now() < (
      select m.kickoff_at - interval '15 minutes'
      from public.matches m
      where m.id = match_id
    )
  )
  with check (user_id = auth.uid());

create policy "users delete their predictions before lock"
  on public.predictions for delete to authenticated
  using (
    user_id = auth.uid()
    and now() < (
      select m.kickoff_at - interval '15 minutes'
      from public.matches m
      where m.id = match_id
    )
  );

create or replace view public.user_scores as
select
  p.user_id,
  count(*) filter (
    where mr.home_score = p.home_score
      and mr.away_score = p.away_score
  ) as exact_count,
  coalesce(sum(
    case
      when mr.home_score = p.home_score
        and mr.away_score = p.away_score
        then 5
      when sign(mr.home_score - mr.away_score) = sign(p.home_score - p.away_score)
        then 2
      else 0
    end
    * case when p.is_boosted then 2 else 1 end
  ), 0) as total_points
from public.predictions p
join public.match_results mr on mr.match_id = p.match_id
group by p.user_id;

create or replace view public.company_scores as
select
  cm.company_id,
  count(distinct cm.user_id) as member_count,
  count(distinct us.user_id) as active_member_count,
  coalesce(avg(us.total_points), 0) as avg_points,
  coalesce(sum(us.total_points), 0) as total_points
from public.company_members cm
left join public.user_scores us on us.user_id = cm.user_id
group by cm.company_id;

create or replace view public.matches_with_status as
select
  m.id,
  m.home_team_id,
  m.away_team_id,
  m.kickoff_at,
  m.stage,
  m.created_at,
  case
    when exists (
      select 1
      from public.match_results mr
      where mr.match_id = m.id
    ) then 'finished'
    when now() >= m.kickoff_at - interval '15 minutes' then 'locked'
    else 'scheduled'
end as status
from public.matches m;

drop view if exists public.company_members_with_scores;

create or replace view public.company_members_with_scores as
select
  cm.company_id,
  cm.user_id,
  p.username,
  p.avatar_url,
  coalesce(us.total_points, 0) as total_points,
  coalesce(us.exact_count, 0) as exact_count,
  cm.joined_at
from public.company_members cm
join public.profiles p on p.id = cm.user_id
left join public.user_scores us on us.user_id = cm.user_id;

grant select on public.user_scores to authenticated;

grant select on public.company_scores to authenticated;

grant select on public.matches_with_status to authenticated;

grant select on public.company_members_with_scores to authenticated;

grant select on public.company_invite_info to authenticated;

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

  if coalesce(p_is_boosted, false) and exists (
    select 1
    from public.predictions p
    where p.user_id = v_user_id
      and p.is_boosted = true
      and p.match_id <> p_match_id
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'BOOST_ALREADY_USED',
      'message', 'Le boost est déjà utilisé sur un autre match.'
    );
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
    coalesce(p_is_boosted, false)
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
      'updated_at', v_prediction.updated_at
    )
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'success', false,
      'error_code', 'BOOST_ALREADY_USED',
      'message', 'Le boost est déjà utilisé sur un autre match.'
    );
end;
$$;

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
  result_away_score integer
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
    mr.away_score
  from public.matches_with_status m
  join public.teams ht on ht.id = m.home_team_id
  join public.teams at on at.id = m.away_team_id
  left join public.predictions p
    on p.match_id = m.id
   and p.user_id = auth.uid()
  left join public.match_results mr on mr.match_id = m.id
  order by m.kickoff_at asc;
$$;

grant execute on function public.upsert_prediction(uuid, integer, integer, boolean) to authenticated;

grant execute on function public.get_match_list() to authenticated;
