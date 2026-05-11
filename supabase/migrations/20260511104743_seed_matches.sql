-- ============================================================================
-- Seed: 72 matchs de la phase de groupes — FIFA World Cup 2026
-- ============================================================================
-- Source     : FIFA + Al Jazeera (calendrier officiel du 7 mai 2026)
-- Stage      : group_stage uniquement (knockout sera seedé post-groupes)
-- Format     : 12 groupes × 6 matchs = 72 matchs, 48 équipes
-- Timezone   : tous les kickoff_at en UTC (D-009)
-- Story      : US-DA-001
--
-- TODO équipe : la WC 2026 introduit un round_of_32 (16 matchs) qui n'est pas
-- dans le CHECK constraint actuel sur `stage`. À ajouter avant le seed knockout.
-- Voir DATA/phases_reference.md
-- ============================================================================

BEGIN;

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Mexico'),
  (SELECT id FROM teams WHERE name = 'South Africa'),
  '2026-06-11T21:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'South Korea'),
  (SELECT id FROM teams WHERE name = 'Czechia'),
  '2026-06-12T04:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Canada'),
  (SELECT id FROM teams WHERE name = 'Bosnia and Herzegovina'),
  '2026-06-12T20:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'United States'),
  (SELECT id FROM teams WHERE name = 'Paraguay'),
  '2026-06-13T05:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Qatar'),
  (SELECT id FROM teams WHERE name = 'Switzerland'),
  '2026-06-13T23:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Brazil'),
  (SELECT id FROM teams WHERE name = 'Morocco'),
  '2026-06-13T23:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Haiti'),
  (SELECT id FROM teams WHERE name = 'Scotland'),
  '2026-06-14T02:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Australia'),
  (SELECT id FROM teams WHERE name = 'Turkiye'),
  '2026-06-14T08:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Germany'),
  (SELECT id FROM teams WHERE name = 'Curacao'),
  '2026-06-14T19:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Netherlands'),
  (SELECT id FROM teams WHERE name = 'Japan'),
  '2026-06-14T22:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Ivory Coast'),
  (SELECT id FROM teams WHERE name = 'Ecuador'),
  '2026-06-15T00:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Sweden'),
  (SELECT id FROM teams WHERE name = 'Tunisia'),
  '2026-06-15T04:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Spain'),
  (SELECT id FROM teams WHERE name = 'Cape Verde'),
  '2026-06-15T17:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Belgium'),
  (SELECT id FROM teams WHERE name = 'Egypt'),
  '2026-06-15T23:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Saudi Arabia'),
  (SELECT id FROM teams WHERE name = 'Uruguay'),
  '2026-06-15T23:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Iran'),
  (SELECT id FROM teams WHERE name = 'New Zealand'),
  '2026-06-16T05:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'France'),
  (SELECT id FROM teams WHERE name = 'Senegal'),
  '2026-06-16T20:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Iraq'),
  (SELECT id FROM teams WHERE name = 'Norway'),
  '2026-06-16T23:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Argentina'),
  (SELECT id FROM teams WHERE name = 'Algeria'),
  '2026-06-17T03:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Austria'),
  (SELECT id FROM teams WHERE name = 'Jordan'),
  '2026-06-17T08:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Portugal'),
  (SELECT id FROM teams WHERE name = 'DR Congo'),
  '2026-06-17T19:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'England'),
  (SELECT id FROM teams WHERE name = 'Croatia'),
  '2026-06-17T22:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Ghana'),
  (SELECT id FROM teams WHERE name = 'Panama'),
  '2026-06-18T00:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Uzbekistan'),
  (SELECT id FROM teams WHERE name = 'Colombia'),
  '2026-06-18T04:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Czechia'),
  (SELECT id FROM teams WHERE name = 'South Africa'),
  '2026-06-18T17:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Switzerland'),
  (SELECT id FROM teams WHERE name = 'Bosnia and Herzegovina'),
  '2026-06-18T23:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Canada'),
  (SELECT id FROM teams WHERE name = 'Qatar'),
  '2026-06-19T02:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Mexico'),
  (SELECT id FROM teams WHERE name = 'South Korea'),
  '2026-06-19T03:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'United States'),
  (SELECT id FROM teams WHERE name = 'Australia'),
  '2026-06-19T23:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Scotland'),
  (SELECT id FROM teams WHERE name = 'Morocco'),
  '2026-06-19T23:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Brazil'),
  (SELECT id FROM teams WHERE name = 'Haiti'),
  '2026-06-20T02:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Turkiye'),
  (SELECT id FROM teams WHERE name = 'Paraguay'),
  '2026-06-20T08:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Netherlands'),
  (SELECT id FROM teams WHERE name = 'Sweden'),
  '2026-06-20T19:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Germany'),
  (SELECT id FROM teams WHERE name = 'Ivory Coast'),
  '2026-06-20T21:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Ecuador'),
  (SELECT id FROM teams WHERE name = 'Curacao'),
  '2026-06-21T04:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Tunisia'),
  (SELECT id FROM teams WHERE name = 'Japan'),
  '2026-06-21T06:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Spain'),
  (SELECT id FROM teams WHERE name = 'Saudi Arabia'),
  '2026-06-21T17:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Belgium'),
  (SELECT id FROM teams WHERE name = 'Iran'),
  '2026-06-21T23:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Uruguay'),
  (SELECT id FROM teams WHERE name = 'Cape Verde'),
  '2026-06-21T23:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'New Zealand'),
  (SELECT id FROM teams WHERE name = 'Egypt'),
  '2026-06-22T05:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Argentina'),
  (SELECT id FROM teams WHERE name = 'Austria'),
  '2026-06-22T19:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'France'),
  (SELECT id FROM teams WHERE name = 'Iraq'),
  '2026-06-22T22:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Norway'),
  (SELECT id FROM teams WHERE name = 'Senegal'),
  '2026-06-23T01:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Jordan'),
  (SELECT id FROM teams WHERE name = 'Algeria'),
  '2026-06-23T07:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Portugal'),
  (SELECT id FROM teams WHERE name = 'Uzbekistan'),
  '2026-06-23T19:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'England'),
  (SELECT id FROM teams WHERE name = 'Ghana'),
  '2026-06-23T21:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Panama'),
  (SELECT id FROM teams WHERE name = 'Croatia'),
  '2026-06-24T00:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Colombia'),
  (SELECT id FROM teams WHERE name = 'DR Congo'),
  '2026-06-24T04:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Switzerland'),
  (SELECT id FROM teams WHERE name = 'Canada'),
  '2026-06-24T23:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Bosnia and Herzegovina'),
  (SELECT id FROM teams WHERE name = 'Qatar'),
  '2026-06-24T23:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Scotland'),
  (SELECT id FROM teams WHERE name = 'Brazil'),
  '2026-06-24T23:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Morocco'),
  (SELECT id FROM teams WHERE name = 'Haiti'),
  '2026-06-24T23:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Czechia'),
  (SELECT id FROM teams WHERE name = 'Mexico'),
  '2026-06-25T03:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'South Africa'),
  (SELECT id FROM teams WHERE name = 'South Korea'),
  '2026-06-25T03:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Ecuador'),
  (SELECT id FROM teams WHERE name = 'Germany'),
  '2026-06-25T21:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Curacao'),
  (SELECT id FROM teams WHERE name = 'Ivory Coast'),
  '2026-06-25T21:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Japan'),
  (SELECT id FROM teams WHERE name = 'Sweden'),
  '2026-06-26T01:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Tunisia'),
  (SELECT id FROM teams WHERE name = 'Netherlands'),
  '2026-06-26T01:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Turkiye'),
  (SELECT id FROM teams WHERE name = 'United States'),
  '2026-06-26T06:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Paraguay'),
  (SELECT id FROM teams WHERE name = 'Australia'),
  '2026-06-26T06:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Norway'),
  (SELECT id FROM teams WHERE name = 'France'),
  '2026-06-26T20:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Senegal'),
  (SELECT id FROM teams WHERE name = 'Iraq'),
  '2026-06-26T20:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Cape Verde'),
  (SELECT id FROM teams WHERE name = 'Saudi Arabia'),
  '2026-06-27T02:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Uruguay'),
  (SELECT id FROM teams WHERE name = 'Spain'),
  '2026-06-27T02:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Egypt'),
  (SELECT id FROM teams WHERE name = 'Iran'),
  '2026-06-27T07:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'New Zealand'),
  (SELECT id FROM teams WHERE name = 'Belgium'),
  '2026-06-27T07:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Panama'),
  (SELECT id FROM teams WHERE name = 'England'),
  '2026-06-27T22:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Croatia'),
  (SELECT id FROM teams WHERE name = 'Ghana'),
  '2026-06-27T22:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Colombia'),
  (SELECT id FROM teams WHERE name = 'Portugal'),
  '2026-06-28T02:30:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'DR Congo'),
  (SELECT id FROM teams WHERE name = 'Uzbekistan'),
  '2026-06-28T02:30:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Algeria'),
  (SELECT id FROM teams WHERE name = 'Austria'),
  '2026-06-28T04:00:00Z',
  'group'
);

INSERT INTO matches (home_team_id, away_team_id, kickoff_at, stage)
VALUES (
  (SELECT id FROM teams WHERE name = 'Jordan'),
  (SELECT id FROM teams WHERE name = 'Argentina'),
  '2026-06-28T04:00:00Z',
  'group'
);

COMMIT;
