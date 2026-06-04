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
