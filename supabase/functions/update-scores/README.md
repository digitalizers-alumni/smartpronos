# Edge Function : update-scores

**US-DA-007** — Synchronise les scores depuis [football-data.org](https://www.football-data.org/) vers la table `match_results`.

## Variables d'environnement requises

À configurer côté backend via `supabase secrets set` :

| Variable | Source | Description |
|---|---|---|
| `FOOTBALL_DATA_KEY` | football-data.org/client/register | Clé API gratuite |
| `SUPABASE_URL` | injecté automatiquement par Supabase | URL du projet |
| `SUPABASE_SERVICE_ROLE_KEY` | injecté automatiquement par Supabase | Clé service_role |
| `RESEND_API_KEY` | resend.com (compte gratuit) | Clé API Resend pour l'envoi d'alertes e-mail |
| `ALERT_EMAIL_TO` | défini par la team Data | Destinataires de l'alerte, séparés par virgule |
| `ALERT_EMAIL_FROM` | optionnel | Expéditeur (défaut : onboarding@resend.dev de Resend) |

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
  "errors": [],
  "alerts_candidates": 0,
  "alerts_sent": 0,
  "alerts_failed": 0,
  "alerts_skipped_no_config": false,
  "alert_errors": []
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

## Alerte e-mail (anti-spam)

L'Edge Function détecte les matchs dont `kickoff_at + 180 min` est
passé sans score ingéré. Pour chacun, elle envoie un e-mail via
[Resend](https://resend.com) et marque l'alerte dans la table
`match_alerts` (PK = match_id) pour ne pas la renvoyer.

### Configuration

1. Créer un compte gratuit sur https://resend.com
2. (Recommandé) Vérifier le domaine d'envoi production. Sans ça,
   seul `onboarding@resend.dev` peut être utilisé en `from`, avec
   restriction d'envoi vers l'adresse du compte uniquement.
3. Configurer les secrets côté Supabase :
```bash
   supabase secrets set RESEND_API_KEY=<votre_cle_resend>
   supabase secrets set ALERT_EMAIL_TO=destinataire1@example.com,destinataire2@example.com
   supabase secrets set ALERT_EMAIL_FROM=alerts@votre-domaine.app
```

### Mode dégradé

Si `RESEND_API_KEY` ou `ALERT_EMAIL_TO` n'est pas configurée, la
section alerte est désactivée (warning loggé). Le sync de scores
continue normalement. La réponse JSON contient
`alerts_skipped_no_config: true`.

### Reset manuel d'une alerte

Pour re-déclencher une alerte sur un match (rare — pour tests ou
correction) :
```sql
DELETE FROM match_alerts WHERE match_id = '<uuid_du_match>';
```

## Logs et monitoring
Logs accessibles via :
```bash
supabase functions logs update-scores
```
Ou dans le dashboard : Supabase → Edge Functions → update-scores → Logs.
