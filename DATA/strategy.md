# Stratégie de récupération des données — MVP

## 1. Stratégie retenue

Stratégie hybride :
- **Source primaire** : API-Football (api-sports.io), tier gratuit
  - league=1, season=2026
  - quota : 100 requêtes/jour
  - timestamps UTC fournis nativement par l'API
- **Fallback** : saisie manuelle par la team Data en cas d'indisponibilité
  de l'API ou de dépassement du quota

Cette stratégie est cohérente avec l'infrastructure prévue dans US-DO-002
(variable `API_FOOTBALL_KEY`) et US-DO-009 (logs du cron de mise à jour
des résultats).

## 2. Périmètre de l'API

L'API alimente uniquement la table `match_results` (scores des matchs
terminés).

Le seed des fixtures (`matches`) et du référentiel (`teams`) reste manuel :
- US-DA-001 : seed des 72 matchs de la phase de groupes (déjà fait)
- US-DA-004 : seed des 48 équipes (team Data)

## 3. Convention de nommage des équipes

Documentée dans `DATA/phases_reference.md` §4. Source de vérité unique
pour éviter toute divergence.

## 4. Calendrier opérationnel

- **Pré-tournoi** : seed initial des fixtures + équipes (R0)
- **Pendant le tournoi** : ingestion automatique des scores via l'API
  par le job d'ingestion backend (déclenché par cron, cf. US-DO-009)
- **Phase knockout** : seed des 32 matchs knockout une fois les
  classements de groupes connus

## 5. Continuité de service

La team Data est responsable de la continuité du pipeline de données
pendant toute la durée du tournoi, y compris en soirée et le week-end.

L'organisation interne pour garantir cette couverture (rotation,
disponibilité) est laissée à l'équipe.

## 6. Stratégie de vérification

### Problème à résoudre

La priorité de la vérification est de détecter une panne d'ingestion
(API down, quota dépassé, erreur silencieuse) avant qu'elle n'impacte
les utilisateurs. La vérification du contenu des scores est secondaire :
l'API-Football est utilisée par des milliers de développeurs et sa
fiabilité de contenu est considérée comme acceptable pour un MVP.

### Architecture en 3 niveaux

#### Niveau 1 — Détection automatique d'absence d'ingestion

Pour chaque match dont `kickoff_at + 2h30` est passé sans ligne dans
`match_results`, une alerte est levée sur le canal Microsoft Teams de
l'équipe Data.

Le seuil de 2h30 couvre les matchs réguliers (90 min) avec leurs arrêts
de jeu et les éventuelles prolongations et tirs au but de la phase
knockout.

#### Niveau 2 — Détection automatique d'anomalies grossières

Pour chaque nouvelle ligne insérée dans `match_results`, vérification
automatique :
- `home_score >= 0` et `away_score >= 0`
- `home_score <= 10` et `away_score <= 10` (au-delà : score suspect,
  alerte sans bloquer l'insertion)
- Pas de doublon `match_id` (déjà couvert par la contrainte UNIQUE)

Toute anomalie déclenche une alerte sur le canal Teams.

#### Niveau 3 — Vérification humaine sur signal

La team Data effectue une vérification manuelle uniquement dans ces cas :
- Alerte de Niveau 1 (ingestion manquante)
- Alerte de Niveau 2 (anomalie détectée)
- Plainte utilisateur sur un score affiché
- Vigilance discrétionnaire sur les matchs critiques (finale, demi-finales)

Procédure de vérification :
1. Consulter `fifa.com` comme source officielle de référence
2. Comparer avec la valeur dans `match_results` (ou son absence)
3. Si écart confirmé : correction via US-BE-024 (UPDATE admin par le
   backend) ou bascule en saisie manuelle si Niveau 1
4. Si pas d'écart : tracer l'incident sur Teams et fermer
5. Tout écart doit être tranché dans la journée où il est détecté

### Source officielle de vérification

`fifa.com` uniquement. Source autoritaire, simple à consulter,
conformément au principe KISS de `01_product_scope.md`.

## 7. Plan B (fallbacks techniques)

- Si l'API-Football est inaccessible → bascule en saisie manuelle par
  la team Data
- Si le quota quotidien est dépassé → bascule en saisie manuelle pour
  les matchs restants de la journée
- En dernier recours sur un score contesté → correction admin via
  US-BE-024

## 8. Risques connus acceptés

Hérités de D-009 (Risques DB acceptés pour le MVP) :
- Pas de versioning des résultats : un seul score officiel, corrections
  via UPDATE admin
- Pas de table d'audit au MVP — les logs d'incidents vivent sur Teams
- Pas de webhook : insertion dans `match_results` déclenche le scoring
  via la vue `user_scores`

Spécifiques à l'API et à la stratégie de vérification :
- Dépendance à un service tiers (api-sports.io)
- Quota free tier (100 req/jour) — surveillance par la team DevOps
- Pas de vérification proactive du contenu : les erreurs subtiles de
  score peuvent passer si elles ne déclenchent ni alerte Niveau 2 ni
  plainte utilisateur. Risque jugé acceptable pour un MVP de 3 semaines

## 9. Localisation

L'app est mono-langue française au MVP.
- Données DB stockées en anglais
- Traduction au rendu côté frontend (cf. `DATA/teams_fr.json`)
- Pas de fallback langue

## 10. Ownership

- Document maintenu par la team Data
- Modifications soumises à review par au moins un autre membre de l'équipe

## 11. Validation équipe attendue

Cette stratégie est une proposition de la team Data, à valider lors du
sync équipe. Plusieurs éléments nécessitent un alignement avec d'autres
équipes :

### Côté team Backend
- Implémentation des niveaux 1 et 2 de la vérification (scripts SQL ou
  logique applicative dans le job d'ingestion)
- Mécanisme de bascule manuelle (endpoint admin)
- Estimation de l'effort : ~0,5 à 1 jour de développement

### Côté team DevOps
- Configuration du webhook Microsoft Teams pour la notification des alertes
  (canaux Niveau 1 et Niveau 2)
- Variable d'env `API_FOOTBALL_KEY` (déjà prévue dans US-DO-002)
- Monitoring du quota API (requêtes restantes/jour)

### Côté team QA
- Tests du happy path (API répond, score inséré, aucune alerte)
- Tests du Niveau 1 (kickoff + 2h30 sans match_results → alerte)
- Tests du Niveau 2 (score aberrant ingéré → alerte)
- Tests du fallback manuel (API down → saisie manuelle fonctionne)

### Points à trancher en équipe
- Validation du seuil 2h30 pour le Niveau 1
- Validation du seuil "score > 10 = suspect" pour le Niveau 2
- Canal Teams dédié aux alertes (channel existant ou nouveau)
