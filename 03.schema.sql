-- ============================================================
-- PRONOSTIC 2026 — SCHEMA SQL (MVP)
-- ============================================================
-- À exécuter dans la console SQL Supabase, dans l'ordre.
-- Chaque section est idempotente où c'est possible.
-- ============================================================


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS moddatetime;
-- gen_random_uuid() est natif Postgres 13+, pas d'extension nécessaire


-- ============================================================
-- 2. HELPER FUNCTIONS
-- (doivent exister avant les tables qui les référencent)
-- ============================================================

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text;
  attempts int := 0;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(
        chars, 1 + floor(random() * length(chars))::int, 1
      );
    END LOOP;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM companies WHERE invite_code = result
    );
    attempts := attempts + 1;
    IF attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique invite code';
    END IF;
  END LOOP;
  RETURN result;
END;
$$;


-- ============================================================
-- 3. TABLES
-- (ordre respecte les dépendances FK)
-- ============================================================

-- 3.1 profiles
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  username    text NOT NULL UNIQUE,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT username_length CHECK (length(username) BETWEEN 2 AND 20)
);

-- 3.2 companies
CREATE TABLE companies (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  invite_code  text NOT NULL UNIQUE DEFAULT generate_invite_code(),
  created_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 3.3 company_members
CREATE TABLE company_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

-- 3.4 teams
CREATE TABLE teams (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name      text NOT NULL UNIQUE,
  code      text NOT NULL UNIQUE CHECK (length(code) = 3),
  flag_url  text
);

-- 3.5 matches
CREATE TABLE matches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team_id  uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  away_team_id  uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  kickoff_at    timestamptz NOT NULL,
  stage         text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT different_teams CHECK (home_team_id <> away_team_id),
  CONSTRAINT valid_stage CHECK (stage IN (
    'group', 'round_of_16', 'quarter_final',
    'semi_final', 'third_place', 'final'
  ))
);

-- 3.6 predictions
CREATE TABLE predictions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id    uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  home_score  integer NOT NULL CHECK (home_score >= 0 AND home_score <= 99),
  away_score  integer NOT NULL CHECK (away_score >= 0 AND away_score <= 99),
  is_boosted  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_id)
);

-- 3.7 match_results
CREATE TABLE match_results (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    uuid NOT NULL UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
  home_score  integer NOT NULL CHECK (home_score >= 0),
  away_score  integer NOT NULL CHECK (away_score >= 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 4. INDEXES
-- ============================================================

-- Indexes de performance sur les FK fréquentes
CREATE INDEX idx_company_members_user_id    ON company_members (user_id);
CREATE INDEX idx_company_members_company_id ON company_members (company_id);
CREATE INDEX idx_predictions_user_id        ON predictions (user_id);
CREATE INDEX idx_predictions_match_id       ON predictions (match_id);
CREATE INDEX idx_matches_kickoff_at         ON matches (kickoff_at);
CREATE INDEX idx_matches_home_team_id       ON matches (home_team_id);
CREATE INDEX idx_matches_away_team_id       ON matches (away_team_id);
CREATE INDEX idx_match_results_match_id     ON match_results (match_id);

-- Index unique partiel : 1 seul boost actif par user
CREATE UNIQUE INDEX one_boost_per_user
  ON predictions (user_id)
  WHERE is_boosted = true;


-- ============================================================
-- 5. TRIGGERS
-- ============================================================

-- 5.1 updated_at automatique
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER set_updated_at_predictions
  BEFORE UPDATE ON predictions
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER set_updated_at_match_results
  BEFORE UPDATE ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

-- 5.2 Auto-création du profile à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    'user_' || substr(NEW.id::text, 1, 8)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

-- 6.1 Activation
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches          ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results    ENABLE ROW LEVEL SECURITY;

-- 6.2 profiles
CREATE POLICY "profiles readable by authenticated"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "users create their own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "users update their own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "users delete their own profile"
  ON profiles FOR DELETE TO authenticated
  USING (id = auth.uid());

-- 6.3 companies
CREATE POLICY "companies readable by all"
  ON companies FOR SELECT TO authenticated USING (true);

CREATE POLICY "any user can create a company"
  ON companies FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "creator can update their company"
  ON companies FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE user_id = created_by AND company_id = companies.id
    )
  );

-- 6.4 company_members
CREATE POLICY "memberships readable by all"
  ON company_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "users join companies themselves"
  ON company_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users leave a company"
  ON company_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 6.5 teams (lecture seule, écriture admin uniquement)
CREATE POLICY "teams readable by all"
  ON teams FOR SELECT TO authenticated USING (true);

-- 6.6 matches (lecture seule, écriture admin uniquement)
CREATE POLICY "matches readable by all"
  ON matches FOR SELECT TO authenticated USING (true);

-- 6.7 match_results (lecture seule, écriture admin uniquement)
CREATE POLICY "results readable by all"
  ON match_results FOR SELECT TO authenticated USING (true);

-- 6.8 predictions (privé par user, deadline T-15)
CREATE POLICY "users see only their predictions"
  ON predictions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users insert their predictions before lock"
  ON predictions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND now() < (
      SELECT kickoff_at - interval '15 minutes'
      FROM matches WHERE id = match_id
    )
  );

CREATE POLICY "users update their predictions before lock"
  ON predictions FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND now() < (
      SELECT kickoff_at - interval '15 minutes'
      FROM matches WHERE id = match_id
    )
  )
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users delete their predictions before lock"
  ON predictions FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND now() < (
      SELECT kickoff_at - interval '15 minutes'
      FROM matches WHERE id = match_id
    )
  );


-- ============================================================
-- 7. VIEWS
-- ============================================================

-- 7.1 user_scores : points par user
CREATE OR REPLACE VIEW user_scores AS
SELECT
  p.user_id,
  COUNT(*) FILTER (
    WHERE mr.home_score = p.home_score
      AND mr.away_score = p.away_score
  ) AS exact_count,
  COALESCE(SUM(
    CASE
      WHEN mr.home_score = p.home_score
        AND mr.away_score = p.away_score
        THEN 5
      WHEN sign(mr.home_score - mr.away_score)
         = sign(p.home_score - p.away_score)
        THEN 2
      ELSE 0
    END
    * CASE WHEN p.is_boosted THEN 2 ELSE 1 END
  ), 0) AS total_points
FROM predictions p
JOIN match_results mr ON mr.match_id = p.match_id
GROUP BY p.user_id;

-- 7.2 company_scores : agrégat par entreprise
CREATE OR REPLACE VIEW company_scores AS
SELECT
  cm.company_id,
  COUNT(DISTINCT cm.user_id) AS member_count,
  COUNT(DISTINCT us.user_id) AS active_member_count,
  COALESCE(AVG(us.total_points), 0) AS avg_points,
  COALESCE(SUM(us.total_points), 0) AS total_points
FROM company_members cm
LEFT JOIN user_scores us ON us.user_id = cm.user_id
GROUP BY cm.company_id;

-- 7.3 matches_with_status : statut dérivé dynamiquement
CREATE OR REPLACE VIEW matches_with_status AS
SELECT
  m.id,
  m.home_team_id,
  m.away_team_id,
  m.kickoff_at,
  m.stage,
  m.created_at,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM match_results mr WHERE mr.match_id = m.id
    ) THEN 'finished'
    WHEN now() >= m.kickoff_at - interval '15 minutes'
      THEN 'locked'
    ELSE 'scheduled'
  END AS status
FROM matches m;


-- ============================================================
-- 8. RPC (interface frontend)
-- Toutes en SECURITY DEFINER pour bypasser la RLS de manière contrôlée
-- ============================================================

-- 8.1 get_global_leaderboard
CREATE OR REPLACE FUNCTION get_global_leaderboard()
RETURNS TABLE (
  rank bigint,
  user_id uuid,
  username text,
  total_points bigint,
  exact_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY
        COALESCE(us.total_points, 0) DESC,
        COALESCE(us.exact_count, 0) DESC,
        p.id
    ) AS rank,
    p.id AS user_id,
    p.username,
    COALESCE(us.total_points, 0) AS total_points,
    COALESCE(us.exact_count, 0) AS exact_count
  FROM profiles p
  LEFT JOIN user_scores us ON us.user_id = p.id
  ORDER BY rank;
$$;

-- 8.2 get_company_leaderboard
CREATE OR REPLACE FUNCTION get_company_leaderboard(p_company_id uuid)
RETURNS TABLE (
  rank bigint,
  user_id uuid,
  username text,
  total_points bigint,
  exact_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY
        COALESCE(us.total_points, 0) DESC,
        COALESCE(us.exact_count, 0) DESC,
        p.id
    ) AS rank,
    p.id AS user_id,
    p.username,
    COALESCE(us.total_points, 0),
    COALESCE(us.exact_count, 0)
  FROM company_members cm
  JOIN profiles p ON p.id = cm.user_id
  LEFT JOIN user_scores us ON us.user_id = p.id
  WHERE cm.company_id = p_company_id
  ORDER BY rank;
$$;

-- 8.3 get_companies_leaderboard
CREATE OR REPLACE FUNCTION get_companies_leaderboard()
RETURNS TABLE (
  rank bigint,
  company_id uuid,
  name text,
  member_count bigint,
  active_member_count bigint,
  avg_points numeric,
  total_points bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY COALESCE(cs.avg_points, 0) DESC, c.id
    ) AS rank,
    c.id AS company_id,
    c.name,
    COALESCE(cs.member_count, 0),
    COALESCE(cs.active_member_count, 0),
    COALESCE(cs.avg_points, 0),
    COALESCE(cs.total_points, 0)
  FROM companies c
  LEFT JOIN company_scores cs ON cs.company_id = c.id
  ORDER BY rank;
$$;

-- 8.4 get_match_list
CREATE OR REPLACE FUNCTION get_match_list()
RETURNS TABLE (
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
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id,
    ht.name, ht.code, ht.flag_url,
    at.name, at.code, at.flag_url,
    m.kickoff_at,
    m.stage,
    m.status,
    p.home_score, p.away_score, p.is_boosted,
    mr.home_score, mr.away_score
  FROM matches_with_status m
  JOIN teams ht ON ht.id = m.home_team_id
  JOIN teams at ON at.id = m.away_team_id
  LEFT JOIN predictions p
    ON p.match_id = m.id AND p.user_id = auth.uid()
  LEFT JOIN match_results mr ON mr.match_id = m.id
  ORDER BY m.kickoff_at;
$$;


-- ============================================================
-- FIN
-- ============================================================
-- Tests recommandés après exécution :
-- 1. Créer un user via Supabase Auth → vérifier qu'une ligne profiles
--    est créée automatiquement
-- 2. Créer une company → vérifier que l'invite_code est généré
-- 3. Insérer un match dans le passé + un match_result → vérifier
--    que matches_with_status retourne 'finished'
-- 4. Tenter d'insérer 2 predictions avec is_boosted=true pour le
--    même user → la 2ème doit échouer
-- 5. Tenter de lire predictions d'un autre user → doit retourner vide
-- ============================================================
