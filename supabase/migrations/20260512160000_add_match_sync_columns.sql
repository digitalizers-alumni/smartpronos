-- Story : US-DA-007 — Pipeline de mise à jour des scores
-- Purpose : tracer la dernière synchronisation par résultat pour le monitoring
-- Source : Edge Function `update-scores` (football-data.org)
-- Note : status n'est PAS stocké (calculé dans la vue matches_with_status)

BEGIN;

ALTER TABLE public.match_results 
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

COMMENT ON COLUMN public.match_results.last_synced_at IS 
  'US-DA-007: timestamp de la dernière synchro via Edge Function update-scores';

CREATE INDEX IF NOT EXISTS idx_match_results_last_synced_at 
  ON public.match_results(last_synced_at);

COMMIT;
