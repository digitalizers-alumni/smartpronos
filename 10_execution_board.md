# 10 — Execution Board

## 🎯 Objectif

Organiser le travail opérationnel de l’équipe Pronostic 2026 pendant le hackathon.

Ce fichier sert à savoir :

```txt
- Qui fait quoi
- Dans quel ordre
- Avec quelles dépendances
- Selon quelle Definition of Done
- Sur quelle branche GitHub
- Avec quelles sources de vérité
```

👉 Ce board doit rester simple, lisible et actionnable.
👉 Il ne remplace pas le Context Brain : il transforme le Context Brain en travail concret.

---

# 🧠 Règle principale

```txt
Aucune tâche ne doit exister sans lien avec :
- une user story
- une règle métier
- un contrat API
- une slice MVP
```

👉 Si une tâche ne sert pas le MVP, elle va au parking.

---

# 📌 Statuts

```txt
TODO      → à faire
DOING     → en cours
BLOCKED   → bloqué
REVIEW    → prêt à être relu/testé
DONE      → terminé et validé
PARKED    → idée mise de côté
```

---

# 👥 Rôles

```txt
PO/SM              → Product Owner / Scrum Master
MOC                → Master of Context
BACKEND            → Backend Supabase
FRONTEND           → Interface PWA
DATA               → Data Football / seed
QA                 → Tests & qualité
DEVOPS             → Infra / GitHub / déploiement
```

---

# 🧱 MVP Vertical Slices

## Slice 1 — Auth & Profile

### Objectif

Permettre à un utilisateur de se connecter, d’avoir un profil et un pseudo.

### Branche

```txt
feat/auth-profile
```

### Sources de vérité

```txt
02_user_stories.md → US-001, US-002
03_data_model.md → profiles
09_api_contracts.md → create_or_update_profile, current_user_profile
11_branching_strategy.md
```

### Tâches

| ID | Tâche | Owner | Statut | Dépend de | DoD |
|---|---|---|---|---|---|
| AUTH-001 | Configurer Supabase Auth magic link | BACKEND | DONE | — | Magic link fonctionnel |
| AUTH-002 | Créer table profiles | BACKEND | DONE | — | Table créée + contrainte auth.users |
| AUTH-003 | Créer RPC create_or_update_profile | BACKEND | DONE | AUTH-002 | RPC conforme API contracts |
| AUTH-004 | Créer RLS profiles | BACKEND | DONE | AUTH-002 | User lit/modifie seulement son profil |
| AUTH-005 | Créer écran login magic link | FRONTEND | TODO | AUTH-001 | Login mobile fonctionnel |
| AUTH-006 | Créer écran choix pseudo | FRONTEND | TODO | AUTH-003 | Pseudo envoyé au backend |
| AUTH-007 | Tests auth/profile | QA | TODO | AUTH-003, AUTH-006 | Cas login + pseudo validés |
| AUTH-008 | Valider slice Auth & Profile | PO/SM | TODO | AUTH-007 | Parcours complet validé |

### Avancement backend

```txt
Statut : DONE
Branche : feat/auth-profile
Commit : f6d0850 feat: add auth profile migration
Livrable : supabase/migrations/20260505120000_auth_profiles.sql
Contenu : table profiles, RLS profiles, RPC create_or_update_profile, vue current_user_profile
Validation : migration appliquée/testée localement via Supabase CLI
```

---

## Slice 2 — Company & Invitation

### Objectif

Permettre à un utilisateur de créer ou rejoindre une entreprise via un lien d’invitation.

### Branche

```txt
feat/company-invite
```

### Sources de vérité

```txt
02_user_stories.md → US-003, US-004, US-005, US-016, US-017
03_data_model.md → companies, company_members
09_api_contracts.md → create_company, join_company_by_invite_code, company_members_with_scores
```

### Tâches

| ID | Tâche | Owner | Statut | Dépend de | DoD |
|---|---|---|---|---|---|
| COMP-001 | Créer tables companies et company_members | BACKEND | TODO | AUTH-002 | Tables + contraintes créées |
| COMP-002 | Créer génération invite_code unique | BACKEND | TODO | COMP-001 | invite_code unique testé |
| COMP-003 | Créer RPC create_company | BACKEND | TODO | COMP-001 | Company créée + membre ajouté |
| COMP-004 | Créer RPC join_company_by_invite_code | BACKEND | TODO | COMP-001 | Join OK + doublon géré |
| COMP-005 | Créer RLS companies/company_members | BACKEND | TODO | COMP-001 | Accès sécurisé |
| COMP-006 | Créer écran créer entreprise | FRONTEND | TODO | COMP-003 | Création mobile fonctionnelle |
| COMP-007 | Créer page /join/:invite_code | FRONTEND | TODO | COMP-004 | Join via lien fonctionnel |
| COMP-008 | Afficher membres entreprise simple | FRONTEND | TODO | COMP-005 | Liste membres visible |
| COMP-009 | Tests company/invitation | QA | TODO | COMP-003, COMP-004, COMP-007 | Création + join + doublon validés |
| COMP-010 | Valider slice Company & Invitation | PO/SM | TODO | COMP-009 | Parcours complet validé |

---

## Slice 3 — Matches & Seed Data

### Objectif

Créer les équipes, les matchs et fournir une liste exploitable côté frontend.

### Branche

```txt
feat/matches-and-seed
```

### Sources de vérité

```txt
02_user_stories.md → US-006, US-007
03_data_model.md → teams, matches
09_api_contracts.md → matches_with_teams, get_matches_with_my_predictions
```

### Tâches

| ID | Tâche | Owner | Statut | Dépend de | DoD |
|---|---|---|---|---|---|
| MATCH-001 | Créer table teams | BACKEND | TODO | — | Table créée |
| MATCH-002 | Créer table matches | BACKEND | TODO | MATCH-001 | Table créée + FK teams |
| MATCH-003 | Créer seed équipes MVP | DATA | TODO | MATCH-001 | Teams insérées proprement |
| MATCH-004 | Créer seed matchs MVP | DATA | TODO | MATCH-002, MATCH-003 | Matchs insérés avec kickoff_at UTC |
| MATCH-005 | Créer view matches_with_teams | BACKEND | TODO | MATCH-002 | Vue conforme API contracts |
| MATCH-006 | Créer RPC get_matches_with_my_predictions | BACKEND | TODO | MATCH-005 | Retourne matchs + prono utilisateur |
| MATCH-007 | Créer écran liste des matchs | FRONTEND | TODO | MATCH-006 | MatchCards visibles |
| MATCH-008 | Créer affichage statut match | FRONTEND | TODO | MATCH-006 | scheduled/locked/finished affichés |
| MATCH-009 | Tests matches/seed | QA | TODO | MATCH-004, MATCH-007 | Liste cohérente et triée |
| MATCH-010 | Valider slice Matches & Seed | PO/SM | TODO | MATCH-009 | Parcours match validé |

---

## Slice 4 — Predictions & Lock

### Objectif

Permettre à un utilisateur de faire/modifier un prono avant deadline, et bloquer toute modification après verrouillage.

### Branche

```txt
feat/predictions-lock
```

### Sources de vérité

```txt
02_user_stories.md → US-008, US-009, US-010, US-011
03_data_model.md → predictions
05_business_rules.md → verrouillage, boost
09_api_contracts.md → upsert_prediction
```

### Tâches

| ID | Tâche | Owner | Statut | Dépend de | DoD |
|---|---|---|---|---|---|
| PRED-001 | Créer table predictions | BACKEND | TODO | AUTH-002, MATCH-002 | Table + unique(user_id, match_id) |
| PRED-002 | Ajouter contraintes scores >= 0 | BACKEND | TODO | PRED-001 | Scores négatifs refusés |
| PRED-003 | Implémenter logique lock backend | BACKEND | TODO | PRED-001, MATCH-002 | now() < kickoff_at - 15min |
| PRED-004 | Implémenter règle boost unique | BACKEND | TODO | PRED-001 | 1 boost max par user |
| PRED-005 | Créer RPC upsert_prediction | BACKEND | TODO | PRED-003, PRED-004 | RPC conforme API contracts |
| PRED-006 | Créer RLS predictions | BACKEND | TODO | PRED-005 | User modifie seulement ses pronos avant lock |
| PRED-007 | Créer PredictionForm | FRONTEND | TODO | PRED-005 | Saisie score mobile |
| PRED-008 | Créer BoostSelector simple | FRONTEND | TODO | PRED-005 | Boost visible et envoyé |
| PRED-009 | Gérer erreurs MATCH_LOCKED / BOOST_ALREADY_USED | FRONTEND | TODO | PRED-005 | Messages clairs affichés |
| PRED-010 | Tests predictions/lock/boost | QA | TODO | PRED-005, PRED-009 | Cas critiques validés |
| PRED-011 | Valider slice Predictions & Lock | PO/SM | TODO | PRED-010 | Parcours prono complet validé |

---

## Slice 5 — Results & Scoring

### Objectif

Permettre l’insertion des résultats officiels et le calcul automatique des points.

### Branche

```txt
feat/results-scoring
```

### Sources de vérité

```txt
02_user_stories.md → US-012
03_data_model.md → match_results, user_scores
05_business_rules.md → scoring
09_api_contracts.md → set_match_result, user_scores, prediction_points
```

### Tâches

| ID | Tâche | Owner | Statut | Dépend de | DoD |
|---|---|---|---|---|---|
| SCORE-001 | Créer table match_results | BACKEND | TODO | MATCH-002 | Table + unique(match_id) |
| SCORE-002 | Créer RPC set_match_result | BACKEND | TODO | SCORE-001 | Admin seulement + status finished |
| SCORE-003 | Créer view prediction_points | BACKEND | TODO | PRED-001, SCORE-001 | Points par prono calculés |
| SCORE-004 | Créer view user_scores | BACKEND | TODO | SCORE-003 | Total points par user |
| SCORE-005 | Intégrer boost dans scoring | BACKEND | TODO | SCORE-004 | Points x2 si boost |
| SCORE-006 | Préparer script insertion résultats MVP | DATA | TODO | SCORE-002 | Résultat test insérable |
| SCORE-007 | Afficher points obtenus dans Mes pronos | FRONTEND | TODO | SCORE-003 | Points visibles si résultat |
| SCORE-008 | Tests scoring complet | QA | TODO | SCORE-004, SCORE-007 | Exact=5, bon=2, mauvais=0, boost=x2 |
| SCORE-009 | Valider slice Results & Scoring | PO/SM | TODO | SCORE-008 | Scores cohérents validés |

---

## Slice 6 — Leaderboards

### Objectif

Afficher les classements global, entreprise et inter-entreprises.

### Branche

```txt
feat/leaderboards
```

### Sources de vérité

```txt
02_user_stories.md → US-013, US-014, US-015
03_data_model.md → user_scores, company_scores
05_business_rules.md → leaderboards
09_api_contracts.md → get_global_leaderboard, get_company_leaderboard, get_company_ranking
```

### Tâches

| ID | Tâche | Owner | Statut | Dépend de | DoD |
|---|---|---|---|---|---|
| LEAD-001 | Créer view company_scores | BACKEND | TODO | SCORE-004, COMP-001 | Moyenne points par entreprise |
| LEAD-002 | Créer RPC get_global_leaderboard | BACKEND | TODO | SCORE-004 | Classement global trié |
| LEAD-003 | Créer RPC get_company_leaderboard | BACKEND | TODO | SCORE-004, COMP-001 | Classement entreprise filtré |
| LEAD-004 | Créer RPC get_company_ranking | BACKEND | TODO | LEAD-001 | Classement entreprises trié |
| LEAD-005 | Créer page leaderboard global | FRONTEND | TODO | LEAD-002 | Classement visible mobile |
| LEAD-006 | Créer page leaderboard entreprise | FRONTEND | TODO | LEAD-003 | Classement collègues visible |
| LEAD-007 | Créer classement entreprises | FRONTEND | TODO | LEAD-004 | Battle sociale visible |
| LEAD-008 | Tests leaderboards | QA | TODO | LEAD-002, LEAD-003, LEAD-004 | Scores et rangs cohérents |
| LEAD-009 | Valider slice Leaderboards | PO/SM | TODO | LEAD-008 | Leaderboards validés |

---

## Slice 7 — Mobile Polish & MVP Demo

### Objectif

Rendre l’expérience mobile fluide, claire et démontrable.

### Branche

```txt
feat/mobile-polish
```

### Sources de vérité

```txt
00_vision.md
01_product_scope.md
04_design_system.md
02_user_stories.md → US-018, US-020
```

### Tâches

| ID | Tâche | Owner | Statut | Dépend de | DoD |
|---|---|---|---|---|---|
| UX-001 | Vérifier navigation mobile | FRONTEND | TODO | LEAD-007 | Home / Pronos / Leaderboard / Profil OK |
| UX-002 | Ajouter états loading/error/empty | FRONTEND | TODO | MATCH-007, PRED-007, LEAD-005 | Aucun écran vide sans explication |
| UX-003 | Ajouter microcopy fun | FRONTEND | TODO | PRED-009 | Messages fun mais clairs |
| UX-004 | Optimiser lisibilité mobile | FRONTEND | TODO | UX-001 | Boutons larges, textes lisibles |
| UX-005 | Préparer scénario de démo MVP | PO/SM | TODO | UX-004 | Demo script prêt |
| UX-006 | Test end-to-end parcours critique | QA | TODO | UX-005 | Parcours complet validé |
| UX-007 | Release develop → main | DEVOPS | TODO | UX-006 | main stable pour démo |

---

# 🚦 Blocages actifs

| ID | Blocage | Impact | Owner | Statut | Décision attendue |
|---|---|---|---|---|---|
| BLOCK-001 | Aucun blocage identifié | — | — | DONE | — |

---

# 🅿️ Parking lot

Idées intéressantes mais hors MVP immédiat.

| ID | Idée | Pourquoi parked | Revoir quand |
|---|---|---|---|
| PARK-001 | Notifications push | Hors scope MVP | Après MVP stable |
| PARK-002 | Chat entre collègues | Trop complexe | Après démo |
| PARK-003 | IA prédictive | Hors positionnement produit | Probablement jamais MVP |
| PARK-004 | Dashboard admin complet | Trop lourd | Si besoin réel après test |

---

# 📅 Rituel quotidien recommandé

## Daily 15 minutes

Chaque rôle répond à :

```txt
1. Qu’est-ce qui a été terminé ?
2. Qu’est-ce qui est en cours ?
3. Qu’est-ce qui bloque l’intégration ?
```

Puis le Master of Context vérifie :

```txt
- Une décision doit-elle être ajoutée au decisions_log ?
- Un API contract doit-il être mis à jour ?
- Une règle métier a-t-elle changé ?
- Une tâche doit-elle être déplacée au parking ?
```

---

# ✅ Definition of Done globale MVP

Le MVP est considéré intégrable si :

```txt
- Auth + profil fonctionne
- Création/rejoindre entreprise fonctionne
- Matchs visibles
- Pronos créables/modifiables avant deadline
- Pronos bloqués après deadline
- Boost unique respecté
- Résultat officiel insérable
- Points calculés côté backend
- Leaderboards cohérents
- Parcours mobile fluide
- Demo stable sur main
```

---

# 🧠 Rappel

```txt
Le board n’est pas là pour faire joli.
Il est là pour empêcher le chaos de se déguiser en créativité.
```

👉 Si une tâche ne rapproche pas du MVP jouable, elle sort du board.

