# Stratégie de récupération des données — MVP

## 1. Stratégie retenue

Stratégie hybride :
- **Source primaire** : [football-data.org](https://www.football-data.org/),
  tier gratuit
  - Compétition : `WC` (FIFA World Cup), saison 2026
  - Quota : 10 requêtes/minute (largement suffisant avec un cron à 5 min)
  - Timestamps UTC fournis nativement par l'API
- **Fallback** : insertion manuelle par la team Backend (sur demande de
  la team Data) via Supabase Studio, en cas d'indisponibilité de l'API
  ou d'écart détecté

L'ingestion est réalisée par l'Edge Function Supabase `update-scores`
(`supabase/functions/update-scores/`).

## 2. Périmètre de l'API

L'API alimente uniquement la table `match_results` (scores des matchs
terminés).

Le seed des fixtures (`matches`) et du référentiel (`teams`) reste
manuel :
- US-DA-001 : seed des 72 matchs de la phase de groupes (fait)
- US-DA-004 : seed des 48 équipes (fait)

## 3. Convention de nommage des équipes

Documentée dans `DATA/phases_reference.md` §4. Source de vérité unique.

En résumé : `teams.name` (anglais, source FIFA, utilisé pour les
jointures et l'ingestion API) et `teams.name_fr` (français, utilisé
pour l'affichage frontend).

## 4. Calendrier opérationnel

- **Pré-tournoi** : seed initial des fixtures + équipes (R0)
- **Pendant le tournoi** : ingestion automatique des scores via l'Edge
  Function `update-scores`, déclenchée par un cron (toutes les 5 min,
  configuration à la charge de la team Backend/DevOps)
- **Phase knockout** : seed des 32 matchs knockout une fois les
  classements de groupes connus

## 5. Continuité de service

La team Data est responsable de la continuité du pipeline pendant
toute la durée du tournoi, y compris en soirée et le week-end.

L'organisation interne pour garantir cette couverture (rotation,
disponibilité, qui consulte les alertes) est laissée à l'équipe.

## 6. Stratégie de vérification

### Problème à résoudre

La priorité est de détecter une panne d'ingestion (API down,
mauvaise réponse, mapping cassé) avant que les utilisateurs ne s'en
aperçoivent. La vérification du contenu des scores eux-mêmes est
secondaire : football-data.org est une API mature, sa fiabilité de
contenu est considérée comme acceptable pour un MVP.

### Détection automatique des retards

Pour chaque match dont `kickoff_at + 180 minutes` est passé sans
ligne dans `match_results`, l'Edge Function `update-scores` envoie
une alerte e-mail au destinataire configuré dans `ALERT_EMAIL_TO`.

Le seuil de 180 min couvre les matchs réguliers (90 min) avec leurs
arrêts de jeu et, en phase knockout, les prolongations + tirs au but.

### Anti-spam structurel

Une seule alerte est envoyée par match (PK `match_alerts.match_id`).
Si l'alerte doit être re-déclenchée pour ce match (rare, lors d'un
test ou d'une correction), supprimer la ligne dans `match_alerts`.

### Source officielle de vérification

`fifa.com` est la source officielle de référence en cas de doute ou
de litige sur un score. Simple, autoritaire, suffisant pour le MVP
(KISS, cf. `01_product_scope.md`).

## 7. Procédure de fallback manuel

Quand la team Data reçoit une alerte e-mail "match en retard" :

1. **Vérifier le score** sur `fifa.com` (et éventuellement une 2ᵉ source
   en cas de doute : Al Jazeera ou BBC Sport)
2. **Demander à la team Backend** d'insérer le score manuellement
   dans `match_results` via Supabase Studio :
   - URL : Supabase Dashboard → Table Editor → `match_results`
   - Insérer une ligne avec `match_id`, `home_score`, `away_score`
   - L'insertion déclenche automatiquement le scoring via la vue
     `user_scores` (D-005)
3. **Tracer la résolution** sur Teams (canal de l'équipe Data) :
   match concerné, score saisi, source de vérification, heure de la
   résolution
4. **Pas de reset de l'alerte** : l'alerte ayant déjà été envoyée et
   tracée dans `match_alerts`, le système ne re-déclenchera pas

Note : un endpoint admin POST dédié sur `match_results` pourrait
remplacer cette procédure à terme. Pour l'instant, la team Backend
est dans la boucle à chaque correction manuelle.

## 8. Plan B (fallbacks techniques)

- Si l'API football-data.org est inaccessible → l'Edge Function échoue
  silencieusement, les matchs non ingérés déclencheront une alerte
  après 180 min → procédure de fallback manuel
- Si Resend est inaccessible (alerte non envoyée) → mode dégradé
  signalé dans la réponse JSON `alerts_failed > 0` ou
  `alerts_skipped_no_config`. Surveillance manuelle des logs
  recommandée par la team DevOps
- En dernier recours sur un score contesté → correction admin via
  `US-BE-024`

## 9. Risques connus acceptés

Hérités de D-009 (Risques DB acceptés pour le MVP) :
- Pas de versioning des résultats : un seul score officiel,
  corrections via UPDATE
- Pas de table d'audit complète au MVP — les corrections manuelles
  sont tracées dans le canal Teams de l'équipe Data
- Pas de webhook : insertion dans `match_results` déclenche le
  scoring via la vue `user_scores`

Spécifiques à l'API et à la stratégie de vérification :
- Dépendance à un service tiers (football-data.org)
- Quota free tier (10 req/min) — largement suffisant à 1 req/5 min
- Dépendance à Resend pour les alertes (alternative envisageable
  post-MVP : changer de fournisseur via la variable d'env)
- Pas de vérification proactive du contenu : les erreurs subtiles
  de score peuvent passer si elles ne déclenchent ni détection de
  retard ni plainte utilisateur. Risque jugé acceptable pour un
  MVP de 3 semaines

## 10. Localisation

L'app est mono-langue française au MVP.
- Données DB stockées en anglais (`teams.name`)
- Affichage français via `teams.name_fr` (cf.
  `DATA/phases_reference.md` §4)
- Pas de fallback langue

## 11. Ownership

- Document maintenu par la team Data
- Modifications soumises à review par au moins un autre membre de
  l'équipe
- Les variables d'environnement (`RESEND_API_KEY`, `ALERT_EMAIL_TO`,
  `ALERT_EMAIL_FROM`, `FOOTBALL_DATA_KEY`) sont sous la
  responsabilité de la team Backend/DevOps

## 12. Décisions à confirmer en équipe

Cette stratégie est issue de discussions équipe partielles. Plusieurs
points méritent une validation explicite lors d'un sync :

- **Adresse de destination de l'alerte** : à définir
- **Domaine d'envoi Resend** : production vs test
  (`onboarding@resend.dev`) — décision team DevOps
- **Fréquence du cron de l'Edge Function** : 5 min recommandées
  (compatible quota free tier), à valider team Backend
- **Canal Teams pour le suivi des résolutions manuelles** : à choisir
  (channel existant ou nouveau) — décision team Data
- **Endpoint admin POST pour `match_results`** : à créer côté Backend
  pour remplacer la procédure manuelle via Supabase Studio (candidat
  pour US-BE-012 ou US-BE-024)

Après validation, ce document doit être mis à jour pour refléter les
choix retenus et retirer cette section.
