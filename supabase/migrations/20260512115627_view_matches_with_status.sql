-- Story: US-DA-003 - Statut d'un match
-- Purpose: Exposer une vue calculant dynamiquement le statut d'un match sans stockage manuel.
-- Sources: matches.kickoff_at, match_results.match_id
-- Notes: Statuts possibles = upcoming, live, finished.

CREATE OR REPLACE VIEW matches_with_status AS
SELECT
  m.id,
  m.home_team_id,
  m.away_team_id,
  m.kickoff_at,
  m.stage,
  mr.home_score,
  mr.away_score,
  CASE
    WHEN mr.match_id IS NOT NULL THEN 'finished'
    WHEN m.kickoff_at > NOW() THEN 'upcoming'
    ELSE 'live'
  END AS status,
  m.created_at
FROM matches m
LEFT JOIN match_results mr
  ON mr.match_id = m.id;

COMMENT ON VIEW matches_with_status IS
'US-DA-003: Vue de statut dynamique des matchs (upcoming, live, finished) basée sur kickoff_at et match_results.';
