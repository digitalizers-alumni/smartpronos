-- Story: US-DA-003 - Statut d'un match
-- Purpose: Exposer une vue calculant dynamiquement le statut d'un match sans stockage manuel.
-- Sources: matches.kickoff_at, match_results.match_id
-- Notes: Statuts possibles = scheduled, locked, finished.

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

comment on view public.matches_with_status is
'US-DA-003: Vue de statut dynamique des matchs (scheduled, locked, finished) basée sur kickoff_at et match_results.';
