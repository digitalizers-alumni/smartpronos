# Edge Function : update-scores

**US-DA-007** — Synchronise les scores depuis [football-data.org](https://www.football-data.org/) vers la table `match_results`.

## Variables d'environnement requises

À configurer côté backend via `supabase secrets set` :

| Variable | Source | Description |
|---|---|---|
| `FOOTBALL_DATA_KEY` | football-data.org/client/register | Clé API gratuite |
| `SUPABASE_URL` | injecté automatiquement par Supabase | URL du projet |
| `SUPABASE_SERVICE_ROLE_KEY` | injecté automatiquement par Supabase | Clé service_role |

## Déploiement (à faire par l'équipe backend)

```bash
# 1. Se positionner à la racine du repo
cd smartpronos

# 2. Linker au projet Supabase (une seule fois)
supabase link --project-ref <PROJECT_REF>

# 3. Configurer le secret API football-data.org
supabase secrets set FOOTBALL_DATA_KEY=<votre_cle_football_data>

# 4. Déployer la fonction
supabase functions deploy update-scores --no-verify-jwt
```

## Test manuel après déploiement

```bash
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/update-scores \
  -H "Authorization: Bearer <ANON_KEY>"
```

**Note — modèle de données** : cette fonction écrit dans `match_results`. Le `status` (`upcoming` / `live` / `finished`) est calculé dynamiquement par la vue `matches_with_status` (US-DA-003) et **n’est pas stocké** dans une colonne.

Réponse attendue :
```json
{
  "ok": true,
  "synced_at": "2026-06-12T...",
  "fd_matches_received": 72,
  "results_upserted": 42,
  "skipped_not_finished": 28,
  "skipped_unmapped": 2,
  "errors": []
}
```

## Automatisation (à décider par l'équipe backend)

Deux options recommandées :

### Option A — pg_cron (côté Supabase, recommandé)
```sql
SELECT cron.schedule(
  'sync-wc-scores',
  '*/5 * * * *',  -- toutes les 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/update-scores',
    headers := jsonb_build_object('Authorization', 'Bearer <SERVICE_ROLE_KEY>')
  );
  $$
);
```

### Option B — GitHub Action
```yaml
# .github/workflows/sync-scores.yml
name: Sync WC scores
on:
  schedule:
    - cron: '*/5 * * * *'
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST ${{ secrets.SUPABASE_FUNCTION_URL }} \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

## Limitations connues
- Seuls les matchs au statut **`FINISHED`** côté football-data.org donnent lieu à un UPSERT dans `match_results`. Les matchs à venir ou en cours sont comptés dans `skipped_not_finished`.
- Le matching entre équipes repose sur `teams.name` (anglais), puis sur la paire `(home_team_id, away_team_id)` dans `matches`. Si les noms divergent ou si la rencontre n’existe pas en base, le match est ignoré (`skipped_unmapped` ou entrée dans `errors`). Évolution future : table `external_team_mapping`.
- Quota football-data.org plan gratuit : 10 requêtes/minute. Une exécution = 1 requête (largement OK avec un cron du type `*/5`).

## Logs et monitoring
Logs accessibles via :
```bash
supabase functions logs update-scores
```
Ou dans le dashboard : Supabase → Edge Functions → update-scores → Logs.
