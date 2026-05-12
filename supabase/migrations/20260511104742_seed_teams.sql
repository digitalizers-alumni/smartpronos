-- US-DA-004 — Référentiel des équipes (seed reproductible)
-- Objectif : peupler `teams` avant `20260511104743_seed_matches.sql` pour que `supabase db reset` fonctionne.
-- Alignement : noms identiques à `seed_matches.sql` et à `DATA/teams_fr.json` (libellés EN).
-- Codes : trigrammes FIFA usage courant pour la Coupe du monde.
-- flag_url : PNG 320px flagcdn (`https://flagcdn.com/w320/<iso2>.png`), voir `DATA/teams_seed.csv`.
-- Idempotence : `ON CONFLICT (name) DO NOTHING`.

BEGIN;

INSERT INTO public.teams (name, code, flag_url)
VALUES
  ('Algeria', 'ALG', 'https://flagcdn.com/w320/dz.png'),
  ('Argentina', 'ARG', 'https://flagcdn.com/w320/ar.png'),
  ('Australia', 'AUS', 'https://flagcdn.com/w320/au.png'),
  ('Austria', 'AUT', 'https://flagcdn.com/w320/at.png'),
  ('Belgium', 'BEL', 'https://flagcdn.com/w320/be.png'),
  ('Bosnia and Herzegovina', 'BIH', 'https://flagcdn.com/w320/ba.png'),
  ('Brazil', 'BRA', 'https://flagcdn.com/w320/br.png'),
  ('Canada', 'CAN', 'https://flagcdn.com/w320/ca.png'),
  ('Cape Verde', 'CPV', 'https://flagcdn.com/w320/cv.png'),
  ('Colombia', 'COL', 'https://flagcdn.com/w320/co.png'),
  ('Croatia', 'CRO', 'https://flagcdn.com/w320/hr.png'),
  ('Curacao', 'CUW', 'https://flagcdn.com/w320/cw.png'),
  ('Czechia', 'CZE', 'https://flagcdn.com/w320/cz.png'),
  ('DR Congo', 'COD', 'https://flagcdn.com/w320/cd.png'),
  ('Ecuador', 'ECU', 'https://flagcdn.com/w320/ec.png'),
  ('Egypt', 'EGY', 'https://flagcdn.com/w320/eg.png'),
  ('England', 'ENG', 'https://flagcdn.com/w320/gb-eng.png'),
  ('France', 'FRA', 'https://flagcdn.com/w320/fr.png'),
  ('Germany', 'GER', 'https://flagcdn.com/w320/de.png'),
  ('Ghana', 'GHA', 'https://flagcdn.com/w320/gh.png'),
  ('Haiti', 'HAI', 'https://flagcdn.com/w320/ht.png'),
  ('Iran', 'IRN', 'https://flagcdn.com/w320/ir.png'),
  ('Iraq', 'IRQ', 'https://flagcdn.com/w320/iq.png'),
  ('Ivory Coast', 'CIV', 'https://flagcdn.com/w320/ci.png'),
  ('Japan', 'JPN', 'https://flagcdn.com/w320/jp.png'),
  ('Jordan', 'JOR', 'https://flagcdn.com/w320/jo.png'),
  ('Mexico', 'MEX', 'https://flagcdn.com/w320/mx.png'),
  ('Morocco', 'MAR', 'https://flagcdn.com/w320/ma.png'),
  ('Netherlands', 'NED', 'https://flagcdn.com/w320/nl.png'),
  ('New Zealand', 'NZL', 'https://flagcdn.com/w320/nz.png'),
  ('Norway', 'NOR', 'https://flagcdn.com/w320/no.png'),
  ('Panama', 'PAN', 'https://flagcdn.com/w320/pa.png'),
  ('Paraguay', 'PAR', 'https://flagcdn.com/w320/py.png'),
  ('Portugal', 'POR', 'https://flagcdn.com/w320/pt.png'),
  ('Qatar', 'QAT', 'https://flagcdn.com/w320/qa.png'),
  ('Saudi Arabia', 'KSA', 'https://flagcdn.com/w320/sa.png'),
  ('Scotland', 'SCO', 'https://flagcdn.com/w320/gb-sct.png'),
  ('Senegal', 'SEN', 'https://flagcdn.com/w320/sn.png'),
  ('South Africa', 'RSA', 'https://flagcdn.com/w320/za.png'),
  ('South Korea', 'KOR', 'https://flagcdn.com/w320/kr.png'),
  ('Spain', 'ESP', 'https://flagcdn.com/w320/es.png'),
  ('Sweden', 'SWE', 'https://flagcdn.com/w320/se.png'),
  ('Switzerland', 'SUI', 'https://flagcdn.com/w320/ch.png'),
  ('Tunisia', 'TUN', 'https://flagcdn.com/w320/tn.png'),
  ('Turkiye', 'TUR', 'https://flagcdn.com/w320/tr.png'),
  ('United States', 'USA', 'https://flagcdn.com/w320/us.png'),
  ('Uruguay', 'URU', 'https://flagcdn.com/w320/uy.png'),
  ('Uzbekistan', 'UZB', 'https://flagcdn.com/w320/uz.png')
ON CONFLICT (name) DO NOTHING;

COMMIT;
