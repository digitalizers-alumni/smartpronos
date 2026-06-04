begin;

alter table public.matches
  add column if not exists group_name text;

comment on column public.matches.group_name is
  'Nom du groupe pour les matchs de phase de groupes (A-L). NULL pour les matchs à élimination directe.';

alter table public.matches
  drop constraint if exists matches_group_name_valid;

alter table public.matches
  add constraint matches_group_name_valid
  check (group_name is null or group_name ~ '^[A-L]$');

with group_teams (group_name, team_name) as (
  values
    ('A', 'Mexico'),
    ('A', 'South Africa'),
    ('A', 'South Korea'),
    ('A', 'Czechia'),
    ('B', 'Canada'),
    ('B', 'Bosnia and Herzegovina'),
    ('B', 'Qatar'),
    ('B', 'Switzerland'),
    ('C', 'Brazil'),
    ('C', 'Morocco'),
    ('C', 'Haiti'),
    ('C', 'Scotland'),
    ('D', 'United States'),
    ('D', 'Paraguay'),
    ('D', 'Australia'),
    ('D', 'Turkiye'),
    ('E', 'Germany'),
    ('E', 'Curacao'),
    ('E', 'Ivory Coast'),
    ('E', 'Ecuador'),
    ('F', 'Netherlands'),
    ('F', 'Japan'),
    ('F', 'Sweden'),
    ('F', 'Tunisia'),
    ('G', 'Spain'),
    ('G', 'Cape Verde'),
    ('G', 'Saudi Arabia'),
    ('G', 'Uruguay'),
    ('H', 'Belgium'),
    ('H', 'Egypt'),
    ('H', 'Iran'),
    ('H', 'New Zealand'),
    ('I', 'France'),
    ('I', 'Senegal'),
    ('I', 'Iraq'),
    ('I', 'Norway'),
    ('J', 'Argentina'),
    ('J', 'Algeria'),
    ('J', 'Austria'),
    ('J', 'Jordan'),
    ('K', 'Portugal'),
    ('K', 'DR Congo'),
    ('K', 'Uzbekistan'),
    ('K', 'Colombia'),
    ('L', 'England'),
    ('L', 'Croatia'),
    ('L', 'Ghana'),
    ('L', 'Panama')
)
update public.matches m
set group_name = home_group.group_name
from public.teams home_team
join group_teams home_group on home_group.team_name = home_team.name
join public.teams away_team on true
join group_teams away_group on away_group.team_name = away_team.name
where m.home_team_id = home_team.id
  and m.away_team_id = away_team.id
  and m.stage = 'group'
  and home_group.group_name = away_group.group_name;

drop function if exists public.get_match_list();

drop view if exists public.matches_with_status;

create or replace view public.matches_with_status as
select
  m.id,
  m.home_team_id,
  m.away_team_id,
  m.kickoff_at,
  m.stage,
  m.group_name,
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

comment on view public.matches_with_status is
  'Vue de statut dynamique des matchs (scheduled, locked, finished), incluant group_name pour les filtres frontend.';

grant select on public.matches_with_status to authenticated;

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
  group_name text,
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
    m.group_name,
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

grant execute on function public.get_match_list() to authenticated;

commit;
