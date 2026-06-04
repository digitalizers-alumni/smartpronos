create table if not exists public.team_external_mappings (
  provider text not null,
  external_name text not null,
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (provider, external_name)
);

alter table public.team_external_mappings enable row level security;

drop policy if exists "team external mappings readable by authenticated" on public.team_external_mappings;
create policy "team external mappings readable by authenticated"
  on public.team_external_mappings for select to authenticated using (true);

grant select on public.team_external_mappings to authenticated;

insert into public.team_external_mappings (provider, external_name, team_id)
select mapping.provider, mapping.external_name, teams.id
from (
  values
    ('football-data', 'Bosnia-Herzegovina', 'Bosnia and Herzegovina'),
    ('football-data', 'Cape Verde Islands', 'Cape Verde'),
    ('football-data', 'Congo DR', 'DR Congo'),
    ('football-data', 'Curaçao', 'Curacao'),
    ('football-data', 'Turkey', 'Turkiye')
) as mapping(provider, external_name, internal_name)
join public.teams on teams.name = mapping.internal_name
on conflict (provider, external_name) do update
set team_id = excluded.team_id;
