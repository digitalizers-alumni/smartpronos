-- Story : US-DA-007 — Pipeline de mise à jour des scores
-- Purpose : tracer l'envoi d'une alerte e-mail "match en retard de score"
--           pour éviter d'envoyer plusieurs fois la même alerte.
-- Source : Edge Function `update-scores` (anti-spam structurel via PK)
-- Note   : table dédiée plutôt qu'une colonne sur match_results, car
--          aucune ligne match_results n'existe tant que le score n'a
--          pas été ingéré (donc on ne peut pas flagger une absence).

BEGIN;

CREATE TABLE public.match_alerts (
    match_id uuid PRIMARY KEY REFERENCES public.matches(id) ON DELETE CASCADE,
    sent_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.match_alerts IS
  'US-DA-007 : trace une alerte e-mail envoyée par l''Edge Function update-scores
   pour un match terminé depuis plus de 180 min sans score ingéré.
   PK = match_id : la contrainte d''unicité garantit qu''une seule alerte est
   jamais envoyée par match (anti-spam structurel).';

-- RLS : table interne, accès via service_role uniquement (Edge Function)
ALTER TABLE public.match_alerts ENABLE ROW LEVEL SECURITY;
-- Pas de policy : aucun client ne peut lire/écrire, seul le service_role.

COMMIT;
