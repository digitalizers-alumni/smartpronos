# 09 — Consolidated User Stories by Release (v2 — Vertical Thin Slices)

## 🎯 Objectif

Backlog complet **réorganisé en slices verticaux E2E**, où chaque release implique tous les teams et délivre un produit utilisable. Les références au **schéma v2** (cf. `03_data_model_v2.md` et décisions D-005 à D-012) sont injectées sur les stories backend et data dans une section dédiée *"Schéma v2 — éléments concernés"*.

> 👉 **Garde-fou** : aucun narratif ni critère d'acceptation des stories d'origine n'a été modifié. Seules l'organisation par release et l'injection des références v2 ont changé.

---

## 🔠 Convention de numérotation

| Équipe | Préfixe |
|---|---|
| Backend | `US-BE-` |
| Frontend | `US-FE-` |
| Data Football | `US-DA-` |
| Testing & QA | `US-QA-` |
| DevOps | `US-DO-` |

---

## 📦 Plan de releases (vertical thin slices)

| Release | Thème | Tous les teams ? |
|---|---|---|
| **R0** | Walking Skeleton & Foundations | ✅ |
| **R1** | Solo Player Loop | ✅ |
| **R2** | Social Battle (Tribus & Leaderboards) | ✅ (sauf Data) |
| **R3** | Engagement Layer | ✅ (sauf QA) |
| **R4** | Viral Growth Layer | ✅ |
| **R5** | Differentiation + Compliance | ✅ (sauf Data) |
| **R6** | Demo Readiness + Post-MVP (P2) | ✅ (sauf DevOps) |

> **Principe directeur.** Chaque release ouvre un slice E2E qui ajoute de la valeur perceptible par l'utilisateur, et fait travailler les équipes en parallèle. Le découpage horizontal *"d'abord toute l'infra, puis toute l'auth, puis…"* est volontairement abandonné au profit d'un MVP qui s'enrichit slice par slice.

---

## 🔗 Référence schéma v2

Les stories backend et data référencent le schéma v2 produit lors de la session de modélisation DB (cf. `03_data_model_v2.md` et `08_decisions_log.md` D-005 à D-012). Récapitulatif des éléments mobilisés :

**Tables (7) :** `profiles`, `companies`, `company_members`, `teams`, `matches` (sans colonne `status`), `predictions`, `match_results`

**Vues (3) — jamais stockées (D-005) :** `user_scores`, `company_scores`, `matches_with_status`

**RPC (4, `SECURITY DEFINER`) :** `get_global_leaderboard()`, `get_company_leaderboard(uuid)`, `get_companies_leaderboard()`, `get_match_list()`

**Helpers (2) :** `generate_invite_code()`, `handle_new_user()` (trigger sur `auth.users`)

**Index spécial :** `one_boost_per_user` (UNIQUE partiel sur `predictions(user_id) WHERE is_boosted = true`)

**Décisions structurantes :**
- D-005 : pas de stockage des points
- D-006 : teams libres reportées post-MVP
- D-007 : statut match calculé dynamiquement
- D-008 : membres sans prono exclus de la moyenne entreprise
- D-009 : risques DB acceptés pour le MVP
- D-010 : profil créé via trigger sur `auth.users`
- D-011 : invite_code 8 chars alphanum (pas d'I/O/0/1)
- D-012 : boost perdu si match annulé

---

# 🟦 RELEASE R0 — Walking Skeleton & Foundations

> **Premier slice E2E minimal.** Un utilisateur peut s'inscrire, voir un match du référentiel, et soumettre un prono persisté. Pas encore de scoring, pas de leaderboard, pas d'entreprise — mais tous les teams contribuent dès cette release : DevOps (infra), Frontend (shell + login + match list + prono form), Backend (auth, matchs, pronos basiques, RLS), Data (référentiel équipes/matchs), QA (auth E2E).

---


## Backend


### US-BE-001 — Créer automatiquement un profil utilisateur


En tant que backend,  
je veux créer un profil lorsqu’un utilisateur se connecte pour la première fois,  
afin que l’application puisse l’identifier dans les classements.

#### Critères d’acceptation

```txt
- Un utilisateur authentifié (email + mot de passe) possède une ligne dans profiles
- Le profil contient au minimum : id, email, username
- Le profil est lié à auth.users
- Si le profil existe déjà, il n’est pas recréé
```

#### Tables concernées

```txt
auth.users
profiles
```

#### Schéma v2 — éléments concernés

- Trigger : `handle_new_user()` sur `auth.users` — crée la ligne `profiles` automatiquement à l'inscription (D-010)
- Table : `profiles` (PK = `auth.users.id`, ON DELETE CASCADE)
- Username par défaut : `user_<8 premiers chars de l'uuid>`

#### Priorité

```txt
P0
```

---


### US-BE-002 — Permettre la mise à jour du pseudo


En tant que backend,  
je veux permettre à un utilisateur de modifier son pseudo,  
afin que son nom soit affiché correctement dans les leaderboards.

#### Critères d’acceptation

```txt
- Un utilisateur peut modifier uniquement son propre profil
- Le champ username est obligatoire
- Le username est utilisé dans les leaderboards
- Un utilisateur ne peut pas modifier le profil d’un autre utilisateur
- Le flux reste compatible avec l'authentification email + mot de passe (pas de magic link)
```

#### Tables concernées

```txt
profiles
```

#### Sécurité

```txt
RLS obligatoire
```

#### Schéma v2 — éléments concernés

- Table : `profiles`
- RLS : un utilisateur ne peut UPDATE que sa propre ligne (`auth.uid() = id`)
- Trigger : `set_updated_at_profiles` (extension `moddatetime`)

#### Priorité

```txt
P0
```

---


### US-BE-006 — Stocker les équipes


En tant que backend,  
je veux stocker les équipes de la Coupe du Monde,  
afin de pouvoir créer les matchs.

#### Critères d’acceptation

```txt
- Une équipe possède un nom
- Une équipe peut avoir un code court : FRA, BRA, ARG...
- Une équipe peut avoir un flag_url optionnel
- Le code équipe est unique si renseigné
```

#### Tables concernées

```txt
teams
```

#### Schéma v2 — éléments concernés

- Table : `teams` (CHECK : `code` ISO 3 lettres ou NULL)
- Référentiel : 48 équipes Coupe du Monde 2026
- Lecture publique (RLS open SELECT)

#### Priorité

```txt
P0
```

---


### US-BE-007 — Stocker les matchs


En tant que backend,  
je veux stocker les matchs,  
afin que les utilisateurs puissent faire leurs pronostics.

#### Critères d’acceptation

```txt
- Un match contient une équipe domicile
- Un match contient une équipe extérieur
- Un match contient une date/heure de coup d’envoi
- Un match possède un statut : scheduled, locked, finished
- Les matchs sont lisibles par tous les utilisateurs connectés
```

#### Tables concernées

```txt
matches
teams
```

#### Schéma v2 — éléments concernés

- Table : `matches` — **pas de colonne `status`** (D-007)
- CHECK : `home_team_id <> away_team_id`
- FK : `home_team_id` et `away_team_id` → `teams.id`
- Lecture publique (RLS open SELECT)

#### Priorité

```txt
P0
```

---


### US-BE-009 — Créer ou modifier un pronostic


En tant que backend,  
je veux permettre à un utilisateur de créer ou modifier son prono avant la deadline,  
afin qu’il puisse participer au jeu.

#### Critères d’acceptation

```txt
- L’utilisateur peut saisir home_score et away_score
- Les scores doivent être des entiers >= 0
- Un utilisateur ne peut avoir qu’un seul prono par match
- Si un prono existe déjà, il est mis à jour
- La modification est refusée si le match est verrouillé
- La décision de verrouillage est basée sur l’heure serveur
```

#### Tables concernées

```txt
predictions
matches
```

#### Contraintes

```txt
unique(user_id, match_id)
home_score >= 0
away_score >= 0
```

#### Schéma v2 — éléments concernés

- Table : `predictions` (UNIQUE `(user_id, match_id)`)
- CHECK : `home_score >= 0 AND away_score >= 0`
- RLS : INSERT/UPDATE refusé après deadline (T-15) — vérification directement dans la policy (D-009)
- Trigger : `set_updated_at_predictions`

#### Priorité

```txt
P0
```

---


### US-BE-018 — Sécuriser les données avec RLS


En tant que backend,  
je veux appliquer des règles RLS,  
afin d’éviter qu’un utilisateur lise ou modifie des données non autorisées.

#### Critères d’acceptation

```txt
- Un utilisateur peut lire son profil
- Un utilisateur peut modifier son profil
- Un utilisateur peut lire ses pronostics
- Un utilisateur peut créer/modifier ses pronostics avant lock
- Un utilisateur ne peut pas modifier les pronostics des autres
- Les matchs sont lisibles par les utilisateurs connectés
- Les résultats sont lisibles mais modifiables uniquement par admin
```

#### Tables concernées

```txt
profiles
companies
company_members
matches
predictions
match_results
```

#### Schéma v2 — éléments concernés

- RLS activée sur les 7 tables : `profiles`, `companies`, `company_members`, `teams`, `matches`, `predictions`, `match_results`
- 4 niveaux d'accès : public read, owner read/write, member read, admin only
- Tables admin (`teams`, `matches`, `match_results`) sans policy INSERT/UPDATE/DELETE pour les utilisateurs

#### Priorité

```txt
P0
```

---


## Frontend


### US-FE-001 — Login


En tant qu'utilisateur,
je veux me connecter,
afin d'accéder rapidement à l'application.

#### Critères d'acceptation

```txt
- L'utilisateur peut entrer son email + password sur la page auth/login
- L'utilisateur peut basculer entre connexion et inscription depuis le même écran
- Un lien "mot de passe oublié" déclenche le reset via Supabase Auth
- une requete vers le backend est effectué pour auth
- L'utilisateur accède à l'application après validation email+mot de passe
```

#### Pages et services concernés

```txt
- pages/auth/login
- services/auth.service
```

#### Priorité

```txt
P0
```

---


### US-FE-002 — Profile create


En tant qu'utilisateur,
je veux créer et modifier mon profil avec pseudo et avatar,
afin d'être identifiable dans les classements.

#### Critères d'acceptation

```txt
- L'utilisateur peut créer un profil avec pseudo et avatar optionnel sur onboarding/profile-create
- L'utilisateur peut consulter son profil sur profile/view
- L'utilisateur peut modifier son pseudo et avatar sur profile/edit
- Un composant user-avatar affiche l'image utilisateur
- Les opérations CRUD transitent par user.service
```

#### Pages, composants et services concernés

```txt
- pages/onboarding/profile-create
- pages/profile/view
- pages/profile/edit
- components/user-avatar
- services/user.service
```

#### Priorité

```txt
P0
```

---


### US-FE-006 — View match list


En tant qu'utilisateur,
je veux voir la liste des matchs groupée par date avec leur statut,
afin de faire mes pronostics.

#### Critères d'acceptation

```txt
- La page home/match-list affiche les matchs groupés par date (ou autre critère, à definir)
- Le premier match est mis en avant pour les nouveaux joueurs (CTA d'amorçage)
- Des filtres de statut sont disponibles (open/locked/finished)
- Un composant match-card affiche les équipes, l'heure, le statut et le résumé du prono
- Un composant match-status-badge affiche l'état (open/locked/finished)
- Les données sont fetchées via match.service
```

#### Pages, composants et services concernés

```txt
- pages/home/match-list
- components/match-card
- components/match-status-badge
- services/match.service
```

#### Priorité

```txt
P0
```

---


### US-FE-008 — Make prediction


En tant qu'utilisateur,
je veux prédire le score final d'un match,
afin de gagner des points.

#### Critères d'acceptation

```txt
- La page match/prediction-form contient des inputs score avec validation
- Un composant prediction-form gère les inputs et la validation
- Le prono est soumis via prediction.service en POST
- Une confirmation est affichée après soumission
```

#### Pages, composants et services concernés

```txt
- pages/match/prediction-form
- components/prediction-form
- services/prediction.service
```

#### Priorité

```txt
P0
```

---


### US-FE-020 — Mobile use


En tant qu'utilisateur,
je veux utiliser l'interface facilement depuis mon téléphone,
afin de jouer rapidement depuis un lien partagé.

#### Critères d'acceptation

```txt
- Les boutons sont faciles à toucher (taille minimale suffisante)
- Les textes sont lisibles sans zoom
- Le pronostic se fait rapidement en quelques taps
- Le leaderboard est lisible sur petit écran
- L'application est webapp responsive sur mobile et desktop, pas une application dédiée.
```

#### Fichiers et conventions concernés

- Style global : `src/styles.scss` (breakpoints, touch targets)
- Tokens design : `src/styles/tokens.scss`
- Convention : tous les composants testés en viewport mobile (< 768px)
- Configuration : `tailwind.config.js` (si Tailwind utilisé)

#### Priorité

```txt
P0
```

> Note : story P0 transverse, validée définitivement en R5 mais doit être respectée dès R1.

---


### US-FE-021 — Shared Components


Composants et services partagés utilisés dans toute l'application.

#### Composants et fichiers concernés

```txt
- components/loading-state (skeleton/spinner)
- components/error-state (message "Oups. Quelque chose s'est mal passé")
- guards/auth.guard (redirection des utilisateurs non authentifiés)
- models/match.model
- models/prediction.model
- models/company.model
- models/user.model
```

#### Priorité

```txt
P0
```

---


### US-FE-PP-001 — Initialize Angular 17+ project with strict mode and standalone components


```txt
P0
```

#### Fichiers et configurations concernés

- Projet : `package.json`, `angular.json`, `tsconfig.json`
- Mode strict TypeScript activé
- Standalone components par défaut (Angular 17+)


---


### US-FE-PP-002 — Configure SYNAPSE context, .cursorrules file, and MCP settings


```txt
P0
```

#### Fichiers et configurations concernés

- Fichier : `.cursorrules`
- Configuration MCP : `.cursor/mcp.json` ou équivalent
- Documentation contexte : `docs/synapse.md`


---


### US-FE-PP-003 — Set up ESLint, Prettier, and TypeScript strict configuration


```txt
P0
```

#### Fichiers et configurations concernés

- Fichier : `.eslintrc.js` ou `eslint.config.js`
- Fichier : `.prettierrc.js`
- Fichier : `tsconfig.json` (strict mode)
- Hooks : `.husky/pre-commit` (lint-staged)


---


### US-FE-PP-004 — Initialize state management (Signals or NgRx)


```txt
P0
```

#### Fichiers et configurations concernés

- État global : `src/store/` (Signals ou NgRx)
- Modules : `app.config.ts` (providers)


---


### US-FE-PP-005 — Configure CI/CD pipeline (build, lint, test scripts)


```txt
P0
```

#### Fichiers et configurations concernés

- GitHub Actions : `.github/workflows/ci.yml`
- Scripts : `package.json` (build, lint, test, format)
- Tests CI : configuration Jest/Vitest


---


### US-FE-PP-006 — Build app shell, main layout, and navigation structure


```txt
P0
```

#### Fichiers et composants concernés

- Layout principal : `src/app/app.component.ts`
- Routing : `src/app/app.routes.ts`
- Navigation : `src/app/components/nav-bar/`
- App shell : `src/app/components/app-shell/`


---


## Data


### US-DA-001 — Création de la liste des matchs


**En tant que** responsable Data,
**je veux** créer la liste complète des matchs de la Coupe du Monde,
**afin que** le backend puisse afficher le calendrier aux utilisateurs.

**Critères d'acceptation :**
- Chaque match contient : `id`, `équipe_home`, `équipe_away`, `date`, `heure`, `phase`, `statut`
- Tous les matchs de la phase de groupes sont présents
- Aucun doublon n'existe
- Le format est validé avec l'équipe backend

#### Tables et fichiers de données concernés

- Table : `matches` (insertion en masse via migration ou import)
- Table : `teams` (référencée par `home_team_id`, `away_team_id`)
- Fichier seed : `data/matches_seed.csv` ou `data/matches_2026.json`
- Outil : script d'import (SQL ou Supabase Edge Function)

#### Schéma v2 — éléments concernés

- Données injectées dans la table `matches` (sans champ `status` — D-007)
- Tous les `kickoff_at` en UTC (D-009)
- CHECK : `home_team_id <> away_team_id` empêche les doublons absurdes


---


### US-DA-002 — Identification de la phase d'un match


**En tant que** utilisateur de l'app,
**je veux** savoir à quelle phase appartient chaque match (groupes, 1/8, 1/4, 1/2, finale),
**afin de** comprendre l'importance du match.

**Critères d'acceptation :**
- Chaque match a un champ `phase` rempli
- Les valeurs sont normalisées (ex: `groupes`, `huitièmes`, `quarts`, `demi`, `finale`)

#### Tables et fichiers de données concernés

- Champ : `matches.phase` (ou `matches.stage`)
- Vocabulaire normalisé : `groupes`, `huitièmes`, `quarts`, `demi`, `finale`
- Fichier référentiel : `data/phases_reference.md`

#### Schéma v2 — éléments concernés

- Champ `phase` (ou `stage`) sur `matches` — vocabulaire normalisé
- Pas de table `phases` séparée (KISS, D-005 même logique)


---


### US-DA-003 — Statut d'un match


**En tant que** utilisateur,
**je veux** voir si un match est à venir, en cours ou terminé,
**afin de** savoir si je peux encore parier.

**Critères d'acceptation :**
- Statut possible : `à venir`, `en cours`, `terminé`
- Le statut est mis à jour avant et après chaque match

#### Tables et fichiers de données concernés

- Vue v2 : `matches_with_status` (statut calculé dynamiquement, D-007)
- Source de vérité : `matches.kickoff_at` + présence d'un `match_results`
- Aucun champ stocké à mettre à jour manuellement

#### Schéma v2 — éléments concernés

- Statut **calculé**, pas stocké (D-007)
- Vue `matches_with_status` dérive le statut depuis `kickoff_at` + existence d'un `match_results`
- Aucune mise à jour manuelle de statut nécessaire — règle opérationnelle simplifiée


---


### US-DA-004 — Référentiel des équipes


**En tant que** responsable Data,
**je veux** maintenir une liste des équipes participantes,
**afin que** chaque match soit associé aux bonnes équipes.

**Critères d'acceptation :**
- Chaque équipe a : `id`, `nom`, `code` (ex: FRA, BRA)
- Drapeau optionnel renseigné si possible
- Aucune équipe manquante ni dupliquée

#### Tables et fichiers de données concernés

- Table : `teams` (insertion)
- Champs : `id`, `name`, `code` (ISO 3 lettres), `flag_url`
- Fichier seed : `data/teams_seed.csv`
- Source : liste FIFA officielle Coupe du Monde 2026

#### Schéma v2 — éléments concernés

- Données injectées dans `teams`
- Code ISO 3 lettres ou NULL
- 48 équipes attendues


---


### US-DA-005 — Affichage cohérent des équipes


**En tant que** utilisateur,
**je veux** voir les noms et codes des équipes correctement affichés,
**afin de** reconnaître facilement les équipes.

**Critères d'acceptation :**
- Codes pays standardisés (ISO 3 lettres)
- Noms en français cohérents

#### Tables et fichiers de données concernés

- Champ : `teams.name` (français cohérent)
- Champ : `teams.code` (ISO 3 lettres standardisé)
- Convention de nommage : `data/naming_conventions.md`

#### Schéma v2 — éléments concernés

- Localization côté frontend
- Source `teams.name` reste cohérente côté DB


---


### US-DA-009 — Choix de la stratégie de récupération


**En tant que** team Data,
**je veux** documenter la stratégie hybride API + fallback manuel,
**afin que** l'équipe et les contributeurs futurs comprennent les choix
techniques et opérationnels.

**Critères d'acceptation :**
- Stratégie complète documentée dans `DATA/strategy.md`
- Source primaire : football-data.org (compétition `WC`, saison 2026)
- Mécanisme : Edge Function `update-scores` déclenchée par cron
- Fallback : team Data demande à team Backend d'insérer le score via
  Supabase Studio
- Anti-spam structurel via table `match_alerts`

#### Documents et stratégie concernés

- Documentation : `DATA/strategy.md`
- Configuration : variables d'env (cf. README de l'Edge Function)

#### Schéma v2 — éléments concernés

- Tous les `kickoff_at` en UTC obligatoirement (D-009)
- L'API fournit des timestamps UTC nativement
- Tables impliquées : `matches`, `teams`, `match_results`, `match_alerts`


---


## DevOps


### US-DO-001 — Connexion du repo GitHub à Vercel


> En tant que développeur,
> je veux connecter mon repo GitHub à Vercel,
> afin que chaque push sur `main` déclenche automatiquement un déploiement du frontend.

**Critères d'acceptance :**

- Le repo GitHub est lié à un projet Vercel
- Un push sur `main` déclenche un build et un déploiement automatique
- Le déploiement est accessible via une URL Vercel publique
- Les variables d'environnement (SUPABASE_URL, SUPABASE_ANON_KEY) sont configurées dans Vercel

#### Fichiers, configurations et services concernés

- Repo : GitHub (projet principal)
- Plateforme : Vercel (projet lié)
- Fichier config : `vercel.json` (optionnel)
- Variables d'env Vercel : `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- Documentation : `docs/deployment.md`

> Importance : Haute

---


### US-DO-002 — Connexion du repo GitHub à Render


> En tant que développeur,
> je veux connecter mon repo GitHub à Render,
> afin que chaque push sur `main` déclenche automatiquement un déploiement du backend.

**Critères d'acceptance :**

- Le repo GitHub est lié à un Web Service Render
- Un push sur `main` déclenche un build et un déploiement automatique
- Les variables d'environnement (SUPABASE_URL, SUPABASE_SERVICE_KEY, API_FOOTBALL_KEY) sont configurées dans Render
- Le service tourne en continu (instance Starter, always-on)

#### Fichiers, configurations et services concernés

- Repo : GitHub (projet principal)
- Plateforme : Render (Web Service)
- Fichier config : `render.yaml`
- Variables d'env Render : `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `API_FOOTBALL_KEY`
- Plan Render : Starter (always-on)

> Importance : Haute

---


### US-DO-003 — Initialisation de la base de données Supabase


> En tant que développeur,
> je veux initialiser la base de données PostgreSQL sur Supabase,
> afin d'avoir un environnement de données prêt pour le développement et la production.

**Critères d'acceptance :**

- Le projet Supabase est créé
- Les tables `users`, `matchs`, `pronostics`, `scores`, `classement`, `groupes` sont créées via migrations SQL
- Le Row Level Security (RLS) est activé sur toutes les tables
- Les variables de connexion sont disponibles pour Vercel et Render

#### Fichiers, configurations et services concernés

- Plateforme : Supabase (projet créé)
- Fichier SQL : `schema.sql` (à exécuter dans la console SQL)
- Migrations : `supabase/migrations/`
- 7 tables, 3 vues, 4 RPCs, 2 helpers (cf. `03_data_model_v2.md`)
- Variables : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`

> Importance : Haute

---


## QA


### US-QA-001 — Authentification fonctionnelle


**User Story**  
En tant qu’utilisateur, je veux créer un compte et me connecter afin d’accéder à l’application.

**Critères d’acceptation**
- L’inscription fonctionne avec des données valides
- Le login fonctionne avec des identifiants valides
- Un message d’erreur apparaît si :
  - email déjà utilisé
  - mot de passe incorrect
- Les champs obligatoires sont validés (pas vides)
- L’utilisateur peut se déconnecter

#### Fichiers de tests et scénarios concernés

- Suite E2E : `tests/e2e/auth.spec.ts`
- Scénarios : inscription valide, login valide, erreurs (email pris, mot de passe incorrect), déconnexion
- Fixtures : `tests/fixtures/users.json`
- Outil : Playwright ou Cypress

**Priorité** : 🔴 Critique

---

# 🟩 RELEASE R1 — Solo Player Loop

> **Le jeu single-user devient complet.** L'utilisateur peut modifier ses pronos avant deadline, voir le verrouillage, voir les résultats officiels et les points gagnés. À la fin de R1, le jeu est jouable individuellement de bout en bout. Tous les teams contribuent : BE (scoring), FE (lock + match terminé + mes pronos), Data (pipeline résultats), DevOps (preview/rollback), QA (scoring).

---


## Backend


### US-BE-008 — Fournir la liste des matchs enrichie


En tant que backend,  
je veux retourner la liste des matchs avec les noms d’équipes et le statut,  
afin que le frontend n’ait pas à reconstruire les données.

#### Critères d’acceptation

```txt
- Chaque match retourne home_team_name
- Chaque match retourne away_team_name
- Chaque match retourne kickoff_at
- Chaque match retourne status
- Si l’utilisateur a déjà fait un prono, son prono est inclus
- Les matchs sont triés par date
```

#### Tables / vues concernées

```txt
matches
teams
predictions
```

#### Schéma v2 — éléments concernés

- RPC : `get_match_list()` (`SECURITY DEFINER`, `SET search_path = public`) — retourne en une requête : matchs + équipes + statut dérivé + prono perso + résultat officiel
- Vue : `matches_with_status` (D-007) — statut calculé dynamiquement

#### Priorité

```txt
P0
```

---


### US-BE-010 — Empêcher toute modification après deadline


En tant que backend,  
je veux bloquer la création ou modification d’un prono après la deadline,  
afin de garantir l’équité du jeu.

#### Critères d’acceptation

```txt
- Aucun INSERT de prediction après deadline
- Aucun UPDATE de prediction après deadline
- Aucun DELETE de prediction après deadline
- La deadline est calculée avec kickoff_at - 15 minutes
- Le frontend ne peut pas contourner cette règle
```

#### Règle métier

```txt
is_locked = now() >= kickoff_at - interval '15 minutes'
```

#### Schéma v2 — éléments concernés

- RLS : verrouillage à T-15 implémenté **dans la RLS uniquement**, pas en contrainte SQL (D-009)
- Source de vérité : `matches.kickoff_at - interval '15 minutes'`
- Vue `matches_with_status` aligne le statut côté lecture (D-007)

#### Priorité

```txt
P0
```

---


### US-BE-012 — Enregistrer le résultat officiel d’un match


En tant qu’admin backend,  
je veux pouvoir enregistrer le résultat officiel d’un match,  
afin de déclencher le scoring.

#### Critères d’acceptation

```txt
- Un résultat contient home_score et away_score
- Un match ne peut avoir qu’un seul résultat officiel
- Seul un admin peut créer ou modifier un résultat
- Après insertion du résultat, le match passe à finished
- Les scores utilisateurs deviennent calculables
```

#### Tables concernées

```txt
match_results
matches
```

#### Contraintes

```txt
match_id unique
```

#### Schéma v2 — éléments concernés

- Table : `match_results` (UNIQUE `match_id`)
- Insertion = source de vérité pour le scoring (D-005)
- RLS : INSERT/UPDATE admin uniquement, lecture publique
- Trigger : `set_updated_at_match_results`

#### Priorité

```txt
P0
```

---


### US-BE-013 — Calculer les points utilisateur côté backend


En tant que backend,  
je veux calculer les points des utilisateurs à partir des résultats officiels,  
afin que le scoring soit fiable et non manipulable.

#### Critères d’acceptation

```txt
- Score exact = 5 points
- Bon résultat 1N2 = 2 points
- Mauvais résultat = 0 point
- Boost = points x2
- Le frontend ne calcule jamais les points lui-même
- Les points sont recalculés depuis les données sources
```

#### Tables / vues concernées

```txt
predictions
match_results
user_scores
```

#### Schéma v2 — éléments concernés

- Vue : `user_scores` (jamais stockée — D-005) — calcul à la volée sur `predictions` ⨯ `match_results`
- Multiplicateur boost x2 appliqué dans la vue elle-même
- Source de vérité unique pour les points

#### Priorité

```txt
P0
```

---


## Frontend


### US-FE-007 — View match detail


En tant qu'utilisateur,
je veux voir le détail d'un match,
afin de mieux réfléchir à mon pronostic.

#### Critères d'acceptation

```txt
- La page match/detail affiche les équipes, date, heure et un bloc "Avant le match"
- Le bloc "Avant le match" contient : forme récente, historique, absence clé
- Le bloc "Avant le match" ne révèle jamais le prono
- Le bloc est visible avant verrouillage et masqué une fois le match terminé
- Les données sont récupérées via une requête GET unique
```

#### Pages et services concernés

```txt
- pages/match/detail
- services/match.service
```

#### Priorité

```txt
P0
```

---


### US-FE-009 — Modify prediction pre-lock


En tant qu'utilisateur,
je veux modifier mon pronostic avant le verrouillage,
afin d'ajuster mon choix.

#### Critères d'acceptation

```txt
- Le formulaire prediction-form supporte le mode PUT avec données préremplies
- Une requête PUT met à jour le pronostic existant avant la deadline
- L'utilisateur voit une confirmation de modification
```

#### Composants et services concernés

```txt
- components/prediction-form
- services/prediction.service
```

#### Priorité

```txt
P0
```

---


### US-FE-010 — Lock post-deadline


En tant qu'utilisateur,
je ne veux pas pouvoir modifier mon pronostic après la deadline,
afin que la compétition soit équitable.

#### Critères d'acceptation

```txt
- Les inputs du formulaire sont désactivés après la deadline
- Un message de verrouillage est affiché
- Le composant match-status-badge affiche l'état orange "locked"
```

#### Composants concernés

```txt
- components/prediction-form
- components/match-status-badge
```

#### Priorité

```txt
P0
```

---


### US-FE-012 — Earn points


En tant qu'utilisateur,
je veux voir mes points et mon rang,
afin de suivre ma progression.

#### Critères d'acceptation

```txt
- Un composant user-rank-card affiche la position, les points et le statut
- La page profile/view affiche le total des points
- Les points sont récupérés via une requête GET
```

#### Pages, composants et services concernés

```txt
- components/user-rank-card
- pages/profile/view
- services/user.service
```

#### Priorité

```txt
P0
```

---


### US-FE-031 — Historique


En tant qu'utilisateur,
je veux voir mon historique d'activité de pronostics en un seul endroit,
afin de suivre ma progression sur les matchs passés.

#### Critères d'acceptation

```txt
- Page dédiée "Historique" accessible depuis la navigation principale
- Liste les pronos passés de l'utilisateur, triés par date de match
  (le plus récent en haut)
- Pour chaque prono : équipes, date, mon score, statut du match
  (terminé uniquement)
- Pour les matchs terminés : afficher également le résultat officiel
  et les points gagnés
- Indicateur visuel pour les pronos boostés
- Les pronos à venir / verrouillés n'apparaissent pas dans cette vue
- État vide explicatif si aucun historique n'est disponible
- Mobile-first
- Aucun calcul côté frontend (consomme l'endpoint US-BE-019)
```

#### Pages, composants et services concernés

```txt
- pages/predictions/mine
- components/prediction-row (réutilisable)
- services/prediction.service
```

#### Vision link

```txt
"Voir ses pronos" — US-008 (02_user_stories.md, parcours utilisateur critique MVP)
```

#### Release recommandée

```txt
R3 (Matchs & Pronostics) pour la version basique, enrichie en R4
avec les résultats et points
```

#### Priorité

```txt
P1
```

---

### US-FE-040 — Choix de l'équipe = Tribu de base

En tant que nouvel utilisateur,
je veux choisir l'équipe que je soutiens,
afin de définir ma Tribu de base dès l'onboarding.

#### Critères d'acceptation

```txt
- L'écran onboarding pose la question "Quelle équipe soutiens-tu ?"
- Le choix d'équipe est stocké sur le profil (supported_team)
- Le choix déclenche l'auto-join de la Tribu-nation (US-BE-030)
- Après ce choix, aucun état "sans Tribu" n'existe
```

#### Pages, composants et services concernés

```txt
- pages/onboarding/team-pick
- services/user.service
- services/company.service
```

#### Priorité

```txt
P0
```

---


### US-FE-032 — Déconnexion / logout


En tant qu'utilisateur,
je veux pouvoir me déconnecter de l'application,
afin de protéger mon compte sur des appareils partagés.

#### Critères d'acceptation

```txt
- Bouton "Se déconnecter" accessible depuis la page profil
- Au clic : confirmation simple ("Es-tu sûr ?") puis déconnexion effective
- Redirection vers la page de login
- Le token de session est invalidé côté serveur (pas seulement côté client)
- Aucune donnée utilisateur ne reste accessible après déconnexion
```

#### Pages, composants et services concernés

```txt
- pages/profile/view (bouton intégré)
- services/auth.service (méthode logout)
```

#### Vision link

```txt
"L'utilisateur peut se déconnecter" — US-QA-001
```

#### Release recommandée

```txt
R1 (Authentification & Profil) — complète US-FE-001 et US-BE-001/002
```

#### Priorité

```txt
P0
```

---


### US-FE-033 — Vue match terminé


En tant qu'utilisateur,
je veux voir clairement mon prono, le résultat officiel et les points gagnés
sur un match terminé,
afin de comprendre comment mon score s'est construit.

#### Critères d'acceptation

```txt
- Sur la fiche match (US-FE-007), si le match est terminé :
  - Mon prono affiché côte à côte avec le résultat officiel
  - Indicateur visuel clair : score exact / bon résultat / mauvais
  - Points gagnés sur ce match (avec bonus boost x2 si applicable)
- Si je n'ai pas fait de prono sur ce match : message explicite
  "Tu n'as pas joué ce match"
- Microcopy adaptative :
  "🎯 Score exact !" / "👍 Bon résultat" / "Pas pour cette fois"
```

#### Pages, composants et services concernés

```txt
- pages/match/detail (variante "finished")
- components/match-result-card
```

#### Vision link

```txt
"Recevoir des points / Voir mon classement" — étapes 10-11 du parcours
utilisateur critique (02_user_stories.md)
```

#### Release recommandée

```txt
R4 (Résultats, Scoring & Leaderboards) — dépend de US-BE-012 et US-BE-013
```

#### Priorité

```txt
P0
```

---


## Data


### US-DA-006 — Mise à jour des scores


**En tant que** team Data,
**je veux** que les scores officiels soient récupérés automatiquement
depuis football-data.org via l'Edge Function `update-scores`,
**afin que** le backend calcule les points des utilisateurs sans saisie
humaine en condition normale.

**Critères d'acceptation :**
- L'Edge Function `update-scores` synchronise les scores des matchs
  terminés (`FINISHED`) depuis football-data.org
- Insertion dans `match_results` par UPSERT (idempotent, `match_id` unique)
- Le mapping API → DB se fait via `teams.name` (anglais)
- En cas d'écart ou d'indisponibilité de l'API, la procédure de fallback
  manuel s'applique (cf. `DATA/strategy.md` §7)

#### Tables et fichiers de données concernés

- Table : `match_results` (insertion par UPSERT, colonne `last_synced_at`
  mise à jour à chaque sync)
- Code : `supabase/functions/update-scores/index.ts`
- Variable d'env : `FOOTBALL_DATA_KEY` (cf. README de l'Edge Function)

#### Schéma v2 — éléments concernés

- Insertion dans `match_results` déclenche automatiquement le scoring
  via `user_scores` (D-005)
- `UNIQUE(match_id)` empêche tout doublon, `UPSERT` garantit l'idempotence
- Source de l'insertion (API ou manuelle) transparente pour le schéma


---


### US-DA-007 — Pipeline et précision des scores


**En tant que** team Data,
**je veux** un pipeline d'ingestion fiable des scores avec détection
automatique des retards et procédure de fallback manuel,
**afin que** les scores affichés aux utilisateurs soient à jour et fiables.

**Critères d'acceptation :**
- Détection automatique : pour chaque match dont `kickoff_at + 180 min`
  est passé sans `match_results`, alerte e-mail envoyée via Resend
- Anti-spam structurel : une seule alerte par match
  (PK `match_alerts.match_id`)
- Procédure de fallback manuel documentée dans `DATA/strategy.md` §7
- Source officielle en cas de doute : fifa.com

#### Tables et fichiers de données concernés

- Tables : `match_results`, `match_alerts`
- Code : `supabase/functions/update-scores/index.ts`
- Variables d'env : `RESEND_API_KEY`, `ALERT_EMAIL_TO`,
  `ALERT_EMAIL_FROM` (optionnel)
- Doc : `DATA/strategy.md`

#### Schéma v2 — éléments concernés

- Table `match_alerts` (PK = `match_id`, garantit l'anti-spam structurel)
- `match_results.last_synced_at` pour traçabilité du sync
- Corrections manuelles via UPDATE admin uniquement (D-009, US-BE-024)


---


### US-DA-008 — Déclenchement du calcul des points


**En tant que** backend,
**je veux** être notifié dès qu'un score est validé,
**afin de** mettre à jour le leaderboard automatiquement.

**Critères d'acceptation :**
- Le statut `terminé` déclenche le pipeline backend
- Les scores sont disponibles dans Supabase

#### Tables et fichiers de données concernés

- Table : `match_results` (l'insertion déclenche tout)
- Vue : `user_scores` (recalcul automatique via SQL, D-005)
- Vue : `matches_with_status` (statut `finished` automatique, D-007)

#### Schéma v2 — éléments concernés

- Pas de notification ni de webhook au MVP — la vue `user_scores` se met à jour sans intervention (D-005)
- Le statut `finished` apparaît automatiquement via `matches_with_status`


---


## DevOps


### US-DO-004 — Preview deployments sur Pull Request


> En tant que développeur,
> je veux qu'une URL de preview soit générée automatiquement à chaque Pull Request,
> afin de tester les changements avant de les merger sur `main`.

**Critères d'acceptance :**
- Chaque PR génère une URL de preview unique sur Vercel (ex: `monapp-pr-42.vercel.app`)
- La preview est accessible sans authentification supplémentaire
- L'URL de preview est postée automatiquement dans les commentaires de la PR sur GitHub

#### Fichiers, configurations et services concernés

- Plateforme : Vercel (Preview Deployments natifs)
- Webhook : intégration GitHub native
- Format URL : `monapp-pr-<n>.vercel.app`
- GitHub Action : commentaire automatique sur la PR

> Importance : Moyenne

---


### US-DO-005 — Rollback en cas de déploiement défaillant


> En tant que développeur,
> je veux pouvoir revenir à la version précédente en cas de problème après un déploiement,
> afin de minimiser l'impact sur les utilisateurs.

**Critères d'acceptance :**

- Le rollback est possible en un clic depuis le dashboard Vercel (frontend)
- Le rollback est possible en un clic depuis le dashboard Render (backend)
- Le retour à la version précédente prend moins de 2 minutes

#### Fichiers, configurations et services concernés

- Plateforme : Vercel dashboard (frontend rollback en 1 clic)
- Plateforme : Render dashboard (backend rollback en 1 clic)
- Procédure documentée : `docs/rollback.md`

> Importance : Moyenne

---


## QA


### US-QA-002 — Création de prono


**User Story**  
En tant qu’utilisateur, je veux saisir et enregistrer un prono afin de participer au jeu.

**Critères d’acceptation**
- L’utilisateur peut sélectionner un match
- L’utilisateur peut saisir un score
- Le prono est bien enregistré après validation
- Un message de confirmation est affiché
- Impossible d’envoyer un prono vide
- Les valeurs invalides sont bloquées ou gérées

#### Fichiers de tests et scénarios concernés

- Suite E2E : `tests/e2e/prediction-create.spec.ts`
- Scénarios : sélection match, saisie score, validation, rejet d'un prono vide, gestion des valeurs invalides

**Priorité** : 🔴 Critique

---


### US-QA-003 — Modification de prono


**User Story**  
En tant qu’utilisateur, je veux modifier mon prono afin de corriger une erreur.

**Critères d’acceptation**
- L’utilisateur peut modifier un prono existant
- La modification est bien enregistrée
- Les règles de modification sont respectées (si restrictions)

#### Fichiers de tests et scénarios concernés

- Suite E2E : `tests/e2e/prediction-modify.spec.ts`
- Scénarios : modification avant deadline, blocage après deadline, respect des règles de modification

**Priorité** : 🟠 Important

---


### US-QA-004 — Calcul des points


**User Story**  
En tant qu’utilisateur, je veux que mes points soient calculés correctement afin que le classement soit fiable.

**Critères d’acceptation**
- Score exact → points corrects
- Score incorrect → logique respectée
- Aucun prono → 0 point
- Les règles de calcul sont cohérentes

#### Fichiers de tests et scénarios concernés

- Suite intégration : `tests/integration/scoring.spec.ts`
- Cas testés : score exact (5 pts), bon résultat (2 pts), mauvais (0 pt), boost x2
- Fixtures : `tests/fixtures/predictions_results.json`

**Priorité** : 🔴 Critique

---

# 🟨 RELEASE R2 — Social Battle (Tribus & Leaderboards)

> **Le pilier social s'active.** Création / adhésion à une Tribu, partage de liens d'invitation, et les trois leaderboards (global, Tribu active, inter-Tribus). C'est à partir de R2 que le MOAT *"battle sociale"* devient visible. Tous les teams sauf Data sont actifs.

---


## Backend


### US-BE-003 — Créer une Tribu


En tant que backend,  
je veux permettre à un utilisateur de créer une Tribu,  
afin qu’il puisse inviter d'autres membres.

#### Critères d’acceptation

```txt
- Une Tribu peut être créée avec un nom
- Un invite_code unique est généré
- Le créateur est enregistré dans created_by
- Le créateur devient automatiquement membre de la Tribu
- Création self-service (aucun type, aucun badge, aucune validation TRIBBO)
```

#### Tables concernées

```txt
companies
company_members
```

#### Règle importante

```txt
Une Tribu doit toujours avoir un invite_code unique
```

#### Schéma v2 — éléments concernés

- Table : `companies`
- Helper : `generate_invite_code()` — génère 8 caractères alphanum majuscules sans I/O/0/1, retry jusqu'à unicité (D-011)
- Table : `company_members` — ligne créée pour le créateur avec role = `creator`

#### Priorité

```txt
P0
```

---


### US-BE-004 — Rejoindre une Tribu via invite_code


En tant que backend,  
je veux ajouter un utilisateur à une Tribu via un code d’invitation,  
afin qu’il puisse rejoindre directement la bonne équipe.

#### Critères d’acceptation

```txt
- Le backend reçoit un invite_code
- Le backend retrouve la Tribu correspondante
- L’utilisateur est ajouté dans company_members
- Si l’utilisateur est déjà membre, aucune duplication n’est créée
- Si le code est invalide, une erreur claire est retournée
```

#### Tables concernées

```txt
companies
company_members
```

#### Contraintes

```txt
unique(user_id, company_id)
```

#### Schéma v2 — éléments concernés

- Table : `company_members` (UNIQUE `(user_id, company_id)`)
- Lookup : `companies.invite_code` (unique)
- RLS : un utilisateur peut INSERT pour lui-même uniquement

#### Priorité

```txt
P0
```

---


### US-BE-005 — Récupérer les membres d’une Tribu


En tant que backend,  
je veux fournir la liste des membres d’une Tribu,  
afin que le frontend puisse afficher qui participe.

#### Critères d’acceptation

```txt
- Le backend retourne les membres d’une Tribu
- Chaque membre contient : user_id, username, avatar_url optionnel
- Le score peut être inclus si disponible
- Les données retournées sont lisibles par les membres
```

#### Tables / vues concernées

```txt
company_members
profiles
user_scores
```

#### Schéma v2 — éléments concernés

- Table : `company_members` + JOIN `profiles`
- Vue : `user_scores` (D-005) pour les points des membres
- RLS : lecture autorisée pour les membres de la Tribu

#### Priorité

```txt
P0
```

---


### US-BE-014 — Fournir le leaderboard global


En tant que backend,  
je veux fournir le classement global des utilisateurs,  
afin que le frontend puisse afficher la compétition individuelle.

#### Critères d’acceptation

```txt
- Les utilisateurs sont triés par total_points DESC
- Le username est retourné
- Le total_points est retourné
- Le rang est calculé ou facilement exploitable
- Les égalités sont gérées avec les scores exacts si disponible
- Chaque joueur est labellisé par sa Tribu de base (nation soutenue : drapeau + pays)
```

#### Tables / vues concernées

```txt
profiles
user_scores
predictions
match_results
```

#### Schéma v2 — éléments concernés

- RPC : `get_global_leaderboard()` (`SECURITY DEFINER`)
- Vue dépendante : `user_scores`
- Bypass contrôlé de la RLS pour exposer rang + pseudo + points uniquement (jamais les pronos individuels)

#### Priorité

```txt
P0
```

---


### US-BE-015 — Fournir le leaderboard de la Tribu active


En tant que backend,  
je veux fournir le classement des membres de la Tribu active,  
afin que les membres puissent se comparer entre eux.

#### Critères d’acceptation

```txt
- Le backend reçoit un company_id correspondant à la Tribu active
- Il retourne uniquement les membres de cette Tribu active
- Les membres sont triés par total_points DESC
- Le username et les points sont retournés
- L’utilisateur courant peut identifier sa position
```

#### Tables / vues concernées

```txt
company_members
profiles
user_scores
```

#### Schéma v2 — éléments concernés

- RPC : `get_company_leaderboard(company_id uuid)` (`SECURITY DEFINER`)
- Filtre par `company_id` côté backend
- Vue dépendante : `user_scores`

#### Priorité

```txt
P0
```

---


### US-BE-016 — Fournir le classement des Tribus


En tant que backend,  
je veux fournir le classement des Tribus,  
afin de rendre visible la bataille sociale inter-Tribus.

#### Critères d’acceptation

```txt
- Les Tribus sont triées par score moyen DESC
- Le score Tribu est basé sur la moyenne des points des membres
- Le nombre de membres peut être retourné
- Les Tribus sans score sont gérées proprement
- Le classement inter-Tribu exclut les Tribu-nations (seules les Tribus d'entreprise/groupe concourent)
```

#### Tables / vues concernées

```txt
companies
company_members
company_scores
user_scores
```

#### Schéma v2 — éléments concernés

- RPC : `get_companies_leaderboard()` (`SECURITY DEFINER`)
- Vue : `company_scores` — exposera `member_count` ET `active_member_count` (D-008 : membres sans prono exclus de la moyenne)

#### Priorité

```txt
P0
```

---


### US-BE-017 — Générer un lien d’invitation Tribu


En tant que backend,  
je veux fournir un invite_code exploitable,  
afin que le frontend puisse générer un lien d’invitation.

#### Critères d’acceptation

```txt
- Chaque entreprise possède un invite_code unique
- Le code permet de retrouver l’entreprise
- Le code ne contient pas d’information sensible
- Le lien peut être reconstruit côté frontend
- Tout membre peut générer et partager le lien d'invitation
```

#### Tables concernées

```txt
companies
```

#### Schéma v2 — éléments concernés

- Helper : `generate_invite_code()` — 8 caractères alphanum (D-011)
- Champ : `companies.invite_code` (unique, NOT NULL)
- Pas d'expiration de lien au MVP

#### Priorité

```txt
P0
```

---

### US-BE-030 — Tribu d'équipe nationale + auto-join

En tant que backend,
je veux rattacher automatiquement chaque utilisateur à sa Tribu-nation,
afin de garantir une Tribu de base dès le choix d'équipe.

#### Critères d’acceptation

```txt
- À la sélection d'équipe (US-FE-040), l'utilisateur rejoint automatiquement la Tribu partagée de sa nation
- La Tribu-nation devient la Tribu par défaut de l'utilisateur
- Une seule Tribu-nation existe par pays soutenu
- Le label nation est exploitable par le leaderboard global
- Le profil stocke supported_team en FK vers teams
```

#### Tables concernées

```txt
profiles
teams
companies
company_members
```

#### Priorité

```txt
P0
```

---

### US-BE-031 — Exposer les pronos des membres après verrouillage

En tant que backend,
je veux exposer les pronos des membres de la Tribu uniquement après kickoff,
afin de respecter la règle de masquage avant verrouillage.

#### Critères d’acceptation

```txt
- Pour un match donné, les pronos des membres de la Tribu sont masqués avant coup d'envoi
- Après coup d'envoi, les pronos des membres deviennent visibles
- Les données alimentent l'écran FE "Pronos de la Tribu" (US-FE-037)
- Le calcul des points reste strictement côté backend
```

#### Tables concernées

```txt
predictions
matches
company_members
profiles
```

#### Priorité

```txt
P1
```

---

### US-BE-033 — Tribu active (multi-Tribu)

En tant que backend,
je veux gérer une Tribu active par utilisateur,
afin que les vues sociales se basent sur un contexte Tribu explicite.

#### Critères d’acceptation

```txt
- Le profil stocke active_company_id
- La valeur par défaut d'active_company_id est la Tribu-nation
- Une RPC set_active_company(id) permet de changer l'active parmi les Tribus de l'utilisateur
- Rivalité, pronos de Tribu et onglet "Ma Tribu" se basent sur l'active
```

#### Tables concernées

```txt
profiles
company_members
companies
```

#### Priorité

```txt
P1
```

---


## Frontend


### US-FE-003 — Join Tribu via link


En tant qu'utilisateur,
je veux rejoindre ma Tribu via un lien d'invitation,
afin de participer à la compétition avec les autres membres.

#### Critères d'acceptation

```txt
- L'utilisateur arrive sur onboarding/company-join avec le nom de la Tribu affiché
- L'utilisateur confirme son appartenance en un clic
- L'adhésion est envoyée via company.service avec l'invite code
```

#### Pages et services concernés

```txt
- pages/onboarding/company-join
- services/company.service
```

#### Priorité

```txt
P1
```

---


### US-FE-004 — Create Tribu


En tant qu'utilisateur,
je veux créer une Tribu et générer un lien d'invitation,
afin d'inviter d'autres membres à participer.

#### Critères d'acceptation

```txt
- L'utilisateur peut entrer le nom de la Tribu sur company/create
- Un invite code est généré côté backend et affiché
- Le formulaire reste unique (nom -> créer), sans choix de type
- Aucune "demande à TRIBBO" n'est requise
- Le créateur devient automatiquement membre
```

#### Pages, composants et services concernés

```txt
- pages/company/create
- components/company-badge
- services/company.service
```

#### Priorité

```txt
P1
```

---


### US-FE-005 — View Tribu members


En tant qu'utilisateur,
je veux voir les membres de ma Tribu et leurs scores,
afin de savoir qui participe et me comparer.

#### Critères d'acceptation

```txt
- La page company/members liste les membres avec pseudo, avatar, points
- Un composant leaderboard-table réutilisable affiche les lignes de membres
- Les données sont fournies par le backend
```

#### Pages, composants et services concernés

```txt
- pages/company/members
- components/leaderboard-table
```

#### Priorité

```txt
P1
```

---


### US-FE-013 — Global leaderboard


En tant qu'utilisateur,
je veux voir le classement global de tous les joueurs,
afin de me comparer à tout le monde.

#### Critères d'acceptation

```txt
- La page leaderboard/global affiche le rang, pseudo, points et Tribu de base (drapeau + pays)
- Le composant leaderboard-table est réutilisé avec les données globales
- Les données sont récupérées via une requête GET
- La ligne "toi" reflète l'équipe choisie (nation soutenue)
```

#### Pages, composants et services concernés

```txt
- pages/leaderboard/global
- components/leaderboard-table
```

#### Priorité

```txt
P0
```

---


### US-FE-014 — Tribu leaderboard


En tant qu'utilisateur,
je veux voir le classement des membres de ma Tribu active,
afin de me comparer aux membres de cette Tribu.

#### Critères d'acceptation

```txt
- La page leaderboard/company affiche uniquement les membres de la Tribu active de l'utilisateur
- Les données sont filtrées par company_id (Tribu active) côté backend
- Le composant leaderboard-table est réutilisé
```

#### Pages, composants et services concernés

```txt
- pages/leaderboard/company
- components/leaderboard-table
```

#### Priorité

```txt
P0
```

---


### US-FE-015 — Tribus leaderboard


En tant qu'utilisateur,
je veux voir le classement des Tribus,
afin de suivre la compétition collective.

#### Critères d'acceptation

```txt
- La page leaderboard/companies affiche le nom de la Tribu et le score moyen
- Le composant leaderboard-table est réutilisé avec les données de Tribu
- Les données sont récupérées via une requête GET
- Les Tribu-nations n'apparaissent pas dans ce classement
```

#### Pages, composants et services concernés

```txt
- pages/leaderboard/companies
- components/leaderboard-table
```

#### Priorité

```txt
P0
```

---


### US-FE-016 — Invite colleagues


En tant qu'utilisateur,
je veux partager un lien d'invitation,
afin de faire rejoindre n'importe quel membre à ma Tribu.

#### Critères d'acceptation

```txt
- La page company/invite affiche le lien d'invitation avec un CTA de copie
- Un composant share-link permet la copie dans le presse-papier
- Le lien d'invitation est récupéré via une requête GET
```

#### Pages, composants et services concernés

```txt
- pages/company/invite
- components/share-link
- services/company.service
```

#### Priorité

```txt
P0
```

---


### US-FE-017 — Join via invitation


En tant que nouvel utilisateur,
je veux rejoindre la bonne Tribu depuis un lien partagé,
afin de commencer sans configuration compliquée.

#### Critères d'acceptation

```txt
- La landing page invitation/join à /invite/:token permet l'auto-join après login
- Le token d'invitation est validé via une requête GET
- L'utilisateur rejoint la Tribu via une requête POST après confirmation
- Après onboarding, l'utilisateur rejoint automatiquement la Tribu cible
```

#### Pages et services concernés

```txt
- pages/invitation/join
- services/company.service
```

#### Priorité

```txt
P0
```

---

### US-FE-037 — Pronos de la Tribu sur un match verrouillé

En tant qu'utilisateur,
je veux voir les pronos de ma Tribu sur un match verrouillé/terminé,
afin de comparer les choix une fois le match lancé.

#### Critères d'acceptation

```txt
- Sur un match verrouillé/terminé, un accès "Voir les pronos de ta Tribu" est disponible
- L'écran liste chaque membre avec son prono (et résultat/points si match terminé)
- Les données consomment US-BE-031
- Cet écran remplace le recap d'entreprise post-match
```

#### Pages, composants et services concernés

```txt
- pages/match/tribu-predictions
- components/tribu-prediction-row
- services/prediction.service
```

#### Priorité

```txt
P1
```

---

### US-FE-038 — Multi-Tribu + sélecteur de Tribu active

En tant qu'utilisateur,
je veux appartenir à plusieurs Tribus et choisir ma Tribu active,
afin de piloter la vue sociale selon mon contexte.

#### Critères d'acceptation

```txt
- Un sélecteur permet de choisir entre Tribu-nation et Tribus rejointes
- La Tribu active persiste côté profil (US-BE-033)
- Les écrans sociaux (classement, onglet Tribu, pronos Tribu) suivent la Tribu active
- Le rang utilisateur peut différer selon la Tribu sélectionnée
```

#### Pages, composants et services concernés

```txt
- components/active-tribu-switcher
- services/company.service
- services/leaderboard.service
```

#### Priorité

```txt
P1
```

---


## DevOps


### US-DO-006 — Séparation des environnements dev / production


> En tant que développeur,
> je veux avoir des environnements séparés pour le développement et la production,
> afin d'éviter que les tests impactent les données des utilisateurs réels.

**Critères d'acceptance :**

- Un projet Supabase dédié existe pour l'environnement de développement
- Les variables d'environnement `dev` et `prod` sont clairement séparées dans Vercel et Render
- Les données de prod ne sont jamais accessibles depuis l'environnement de dev

#### Fichiers, configurations et services concernés

- Projets Supabase : `pronostic-dev` + `pronostic-prod`
- Environnements Vercel : `dev` + `prod`
- Environnements Render : `dev` + `prod`
- Fichiers : `.env.development`, `.env.production`

> Importance : Moyenne

---


## QA


### US-QA-005 — Classement utilisateur


**User Story**  
En tant qu’utilisateur, je veux voir un classement à jour afin de connaître ma position.

**Critères d’acceptation**
- Le classement est mis à jour après calcul
- Les positions sont correctes
- Pas d’incohérences entre utilisateurs
- Le classement global affiche la Tribu de base (nation) de chaque joueur
- Le classement/onglet Tribu dépend de la Tribu active de l'utilisateur

#### Fichiers de tests et scénarios concernés

- Suite intégration : `tests/integration/leaderboard.spec.ts`
- Cas : tri par points, gestion des égalités, recalcul après insertion d'un résultat

**Priorité** : 🔴 Critique

---

# 🟧 RELEASE R3 — Engagement Layer

> **Activer l'engagement quotidien.** Boost stratégique, onboarding 30 secondes et centre de notifications in-app pour activer la DAU sans push. Backend, Frontend, Data (contexte match), DevOps (uptime monitoring).

---


## Backend


### US-BE-011 — Gérer le boost utilisateur


En tant que backend,  
je veux permettre à un utilisateur d’activer jusqu'à 5 boosts sur le tournoi,  
afin de doubler ses points sur des matchs stratégiques.

#### Critères d’acceptation

```txt
- Un utilisateur peut utiliser jusqu'à 5 boosts sur l'ensemble du tournoi
- Le boost peut être activé uniquement avant deadline
- Le boost ne peut pas être déplacé après verrouillage du match boosté
- Le boost est pris en compte dans le calcul des points
- Le backend retourne le nombre de boosts restants au format X/5
```

#### Tables concernées

```txt
predictions
matches
```

#### Schéma v2 — éléments concernés

- Le backend applique un plafond à 5 boosts par utilisateur sur le tournoi (retour du compteur restant X/5)
- Boost perdu si match annulé (D-012) — pas de mécanisme de restitution au MVP

#### Priorité

```txt
P0
```

---


### US-BE-019 — Fournir une vue “Mes pronos”


En tant que backend,  
je veux retourner tous les pronostics d’un utilisateur avec les infos match,  
afin que le frontend puisse afficher une page “Mes pronos”.

#### Critères d’acceptation

```txt
- Retourne les pronos de l’utilisateur connecté uniquement
- Inclut les équipes du match
- Inclut kickoff_at
- Inclut le statut du match
- Inclut les points gagnés si le résultat existe
```

#### Schéma v2 — éléments concernés

- Lecture filtrée sur `predictions` (RLS = own only)
- JOIN `matches` + `match_results` pour enrichir avec le résultat et les points (calculés via `user_scores`)
- Pas de vue dédiée nécessaire au MVP

#### Priorité

```txt
P1
```

---


## Frontend


### US-FE-011 — Use boost


En tant qu'utilisateur,
je veux booster un pronostic,
afin de doubler mes points sur un match stratégique.

#### Critères d'acceptation

```txt
- Un toggle boost est disponible dans le formulaire de pronostic
- Un utilisateur ne peut booster qu'un seul pronostic à la fois
- Une requête PATCH active/désactive le boost sur la prédiction
- Le boost est visible sur le pronostic
```

#### Composants et services concernés

```txt
- components/boost-selector
- services/prediction.service
```

#### Priorité

```txt
P10
```

---


### US-FE-022 — Onboarding "30 secondes"


En tant que nouvel utilisateur,
je veux comprendre le jeu en moins de 30 secondes au premier lancement,
afin de me lancer immédiatement sans aide ni doc.

#### Critères d'acceptation

```txt
- Au premier login, 3 cards swipables (ou écran unique condensé) :
  1) "Prédis le score" — exemple visuel d'un prono
  2) "Gagne des points" — barème simple (5 / 2 / 0) + "5 boosts x2 pour tout le tournoi"
  3) "Bats tes collègues" — visuel podium / classement (pas de trophée)
### US-FE-036 — Centre de notifications (in-app)

En tant qu'utilisateur,
je veux un centre de notifications dans l'app,
afin d'être informé des moments clés sans push.

#### Critères d'acceptation

```txt
- Une cloche avec pastille "non lu" est visible dans l'interface
- Une liste regroupe les notifications : rivalité / jour de match / résultat / invitation
- Les notifications sont in-app uniquement (pas de push) pour le MVP
- Les anciennes logiques de bandeaux home sont remplacées par ce centre
- Les données proviennent des flux existants (classements, matchs, résultats)
```

#### Pages, composants et services concernés

```txt
- components/notifications-bell
- pages/notifications/center
- services/notifications.service
```

#### Priorité

```txt
P1
```

---

- Skippable à tout moment via "Passer"
- N'apparaît qu'une seule fois par utilisateur (flag stocké côté profil)
- Compatible mobile-first (swipe horizontal natif)
- Texte fun et bref (vision : "léger, jamais corporate rigide")
```

#### Pages, composants et services concernés

```txt
- pages/onboarding/welcome
- components/onboarding-card
- services/user.service (flag has_seen_onboarding)
```

#### Vision link

```txt
"Comprendre le jeu en moins de 30 secondes" — 00_vision.md
```

#### Release recommandée

```txt
R1 (Authentification & Profil) — juste après création du profil
```

#### Priorité

```txt
P0
```

---




## Data


### US-DA-011 — Contexte avant match


**En tant que** utilisateur,
**je veux** lire un court contexte sur chaque match,
**afin de** mieux réfléchir à mon pronostic.

**Critères d'acceptation :**
- Texte court (1-3 phrases) par match
- Contenu : historique, forme récente, blessure clé ou stat simple
- N'indique pas la réponse au pronostic

#### Tables et fichiers de données concernés

- Champ optionnel : `matches.context_text` (ou table jointe)
- Fichier source : `data/match_contexts.md`
- Format : 1 à 3 phrases par match

#### Schéma v2 — éléments concernés

- Champ optionnel sur `matches` (ex: `context_text`)
- Lecture publique
- Hors scope strictement DB — décision opérationnelle Data


---


## DevOps


### US-DO-007 — Monitoring de la disponibilité du backend


> En tant que développeur,
> je veux être alerté si le backend Render devient indisponible,
> afin de réagir rapidement en cas de panne.

**Critères d'acceptance :**

- UptimeRobot (ou équivalent) est configuré pour pinger l'endpoint `/health` du backend toutes les 5 minutes
- Une alerte email est envoyée si le service ne répond pas sous 30 secondes
- Un endpoint `GET /health` retourne `{ status: "ok" }` avec un HTTP 2002

#### Fichiers, configurations et services concernés

- Service : UptimeRobot (ou équivalent)
- Endpoint backend : `GET /health` (à exposer)
- Fichier : `src/health/health.controller.ts` (ou équivalent)
- Fréquence : ping toutes les 5 minutes
- Alertes : email

> Importance : Basse-Moyenne

---


## QA


### US-QA-007 — Résilience aux actions utilisateur


**User Story**  
En tant qu’utilisateur, je veux que l’application reste stable même en cas d’actions rapides ou incorrectes.

**Critères d’acceptation**
- Les multi-clics ne cassent pas l’app
- Le refresh pendant une action est géré
- Les données invalides ne plantent pas le système
- Navigation rapide sans crash

#### Fichiers de tests et scénarios concernés

- Suite E2E : `tests/e2e/resilience.spec.ts`
- Cas : multi-clic, refresh pendant action, données invalides, navigation rapide entre pages

**Priorité** : 🟠 Important

---

# 🟥 RELEASE R4 — Viral Growth Layer

> **Activer la boucle virale.** CTA d'invitation contextuel, statut ambassadeur visible, badges et microcopy fun, tracking des événements clés (signup → first prono → first invite → converted). Tous les teams contribuent.

---


## Backend


### US-BE-020 — Calculer les scores exacts pour départager les égalités


En tant que backend,  
je veux calculer le nombre de scores exacts par utilisateur,  
afin de départager les égalités dans les classements.

#### Critères d’acceptation

```txt
- Le nombre de scores exacts est calculé côté backend
- Le leaderboard trie d’abord par total_points DESC
- Puis par exact_scores_count DESC
- Puis par user_id si égalité parfaite
```

#### Schéma v2 — éléments concernés

- Vue `user_scores` enrichie : ajouter `exact_scores_count`
- Tri leaderboard : `total_points DESC, exact_scores_count DESC, user_id`
- Pas de stockage (D-005)

#### Priorité

```txt
P1
```

---


### US-BE-021 — Fournir des statistiques simples utilisateur


En tant que backend,  
je veux fournir quelques stats simples à un utilisateur,  
afin d’enrichir son profil sans complexifier le produit.

#### Critères d’acceptation

```txt
- Nombre total de pronos
- Nombre de scores exacts
- Nombre de bons résultats
- Nombre de mauvais pronos
- Total points
```

#### Schéma v2 — éléments concernés

- Vue dérivée des `predictions` ⨯ `match_results`
- Aggregations simples : count, sum
- Pas de stockage (D-005)

#### Priorité

```txt
P1
```

---


### US-BE-022 — Préparer les données pour badges simples


En tant que backend,  
je veux exposer des données simples permettant d’attribuer des badges,  
afin que le frontend puisse afficher une gamification légère.

#### Critères d’acceptation

```txt
- Le backend peut identifier un premier prono
- Le backend peut identifier un score exact
- Le backend peut identifier un utilisateur top 3
- Aucun système de badge complexe n’est créé en base pour le MVP
```

#### Schéma v2 — éléments concernés

- Données dérivées à la volée des `predictions` et `user_scores`
- Pas de table `badges` au MVP — les badges sont calculés (D-005, même logique)

#### Priorité

```txt
P1
```

---




## Frontend


### US-FE-018 — Fun messages


En tant qu'utilisateur,
je veux recevoir des messages légers et amusants,
afin que l'expérience soit plus engageante.

#### Critères d'acceptation

```txt
- Un composant empty-state affiche des microcopies fun quand il n'y a pas de données
- Un fichier de constantes centralise tous les messages fun
- Les messages sont contextuels (pronostic, classement, etc.)
- Les messages ne bloquent jamais l'action principale
```

#### Composants concernés

```txt
- components/empty-state
- constants/microcopy
```

#### Priorité

```txt
P1
```

---


### US-FE-019 — Badges


En tant qu'utilisateur,
je veux obtenir des badges simples,
afin d'avoir une reconnaissance visible de mes performances.

#### Critères d'acceptation

```txt
- Le composant company-badge peut afficher des icônes de badge (streak, top player)
- La page profile/view affiche une section badges
- Les badges sont récupérés via une requête GET
- Les badges ne complexifient pas le scoring principal
```

#### Pages, composants et services concernés

```txt
- components/company-badge
- pages/profile/view
```

#### Priorité

```txt
P1
```

---


### US-FE-024 — CTA d'invitation post-action (boucle virale)


En tant qu'utilisateur,
je veux pouvoir inviter un collègue dans le flux de mes actions positives,
afin que le geste soit naturel plutôt qu'un détour intentionnel.

#### Critères d'acceptation

```txt
- Après confirmation d'un prono : micro-CTA non bloquant
  "Défie un collègue sur ce match"
- Après gain de points (passage match → finished) : micro-CTA
  "Tu progresses. Invite un collègue à te suivre."
- Après franchissement d'un palier (top 10, top 3) : CTA contextuel
  "Tu es 3ème. Tes collègues savent ?"
- Le CTA réutilise share-link (US-FE-016) : un tap = lien copié + toast
- Le CTA peut être ignoré sans friction (croix discrète)
- Plafond : un même utilisateur ne voit pas plus de 1 CTA par session
  pour éviter le spam
```

#### Pages, composants et services concernés

```txt
- components/invite-cta-toast
- components/share-link (réutilisé)
- services/user.service (compteur de CTA vus par session)
```

#### Vision link

```txt
"Effet réseau via invitations" — 00_vision.md
"Si les gens invitent → énorme succès" — critère de succès projet
```

#### Release recommandée

```txt
R5 (Polish) — peut techniquement démarrer dès R3 si un prono existe
```

#### Priorité

```txt
P1
```

---




## DevOps


### US-DO-008 — Tracking des erreurs en production


> En tant que développeur,
> je veux capturer et visualiser les erreurs qui surviennent en production,
> afin de les corriger rapidement sans attendre les retours utilisateurs.

**Critères d'acceptance :**

- Sentry est intégré côté backend (Render) et côté frontend (Vercel)
- Chaque erreur non gérée est capturée avec le stack trace complet
- Une alerte est envoyée pour toute nouvelle erreur critique
- Le plan gratuit Sentry est utilisé (5 000 erreurs/mois)

#### Fichiers, configurations et services concernés

- Service : Sentry (plan gratuit, 5 000 erreurs/mois)
- SDK backend : intégration Render
- SDK frontend : intégration Vercel
- Fichiers config : `sentry.client.config.ts`, `sentry.server.config.ts`
- Variables : `SENTRY_DSN`

> Importance : Moyenne

---


### US-DO-010 — Tracking minimal des événements clés produit


En tant qu'équipe produit,
je veux mesurer 5 événements critiques pour valider les KPI de la vision,
afin de savoir si le produit est un succès au-delà du fait qu'il fonctionne.

#### Critères d'acceptation

```txt
- 5 événements instrumentés a minima :
  - account_created          (signup réussi)
  - first_prediction_made    (premier prono soumis)
  - invite_sent              (lien copié)
  - tribu_joined             (rejoint une Tribu)
- Outillage simple : Plausible, Umami, ou table dédiée Supabase
  (pas de Mixpanel / Amplitude au MVP — overkill 3 semaines)
- Aucune donnée personnelle envoyée à un tiers (RGPD)
- Dashboard accessible (URL ou page Supabase) listant ces compteurs
- Au moment de la démo : capacité à dire "X comptes, Y pronos, Z invitations"
```

#### Vision link

```txt
"Si les gens jouent → succès / Si les gens invitent → énorme succès"
50-500 utilisateurs potentiels — 00_vision.md
```

#### Release recommandée

```txt
R5 (Polish & Démo) — instrumentable plus tôt mais utile en démo
```

#### Importance

```txt
Moyenne
```

#### Fichiers, configurations et services concernés

- Service tracking : à définir (PostHog, Plausible, ou équivalent simple)
- Événements clés : `signup`, `first_prediction`, `invite_sent`, `invite_converted`, `boost_activated`, `match_predicted`
- Fichier : `src/lib/analytics.ts`
- Variables d'env : `ANALYTICS_KEY`


---


## QA


### US-QA-008 — Qualité UI/UX


**User Story**  
En tant qu’utilisateur, je veux une interface claire et utilisable afin d’avoir une bonne expérience.

**Critères d’acceptation**
- Aucun bouton cassé
- Texte lisible
- Interface responsive (mobile/desktop)
- Temps de réponse acceptable

#### Fichiers de tests et scénarios concernés

- Tests visuels : Percy ou Chromatic (visual regression)
- Performance : Lighthouse CI
- Audit responsive : viewport mobile + desktop
- Fichiers : `tests/visual/`, `tests/lighthouse.config.js`

**Priorité** : 🟠 Important

---

# 🟪 RELEASE R5 — Differentiation + Compliance

> **Stories MOAT de différenciation + conformité RGPD.** Head-to-head intra-Tribu, back-office résultats admin, partage externe d'un rang. En parallèle : suppression de compte (RGPD article 17, **bloquant légal**) et option *quitter une Tribu*.
### US-BE-032 — Rôle admin (identité)

En tant que backend,
je veux définir un rôle admin,
afin de protéger la correction de résultats et le back-office.

#### Critères d'acceptation

```txt
- Le profil expose is_admin (ou claim JWT équivalent)
- Le rôle admin est provisionné hors-app (seed/console)
- Les opérations de correction de résultats refusent les non-admin
- Le back-office résultats est réservé aux admins
```

#### Tables concernées

```txt
profiles
match_results
match_alerts
```

#### Priorité

```txt
P1
```

---


---


## Backend




### US-BE-027 — Comparaison head-to-head entre deux utilisateurs


En tant que backend,
je veux fournir la comparaison match-par-match entre deux utilisateurs,
afin que le frontend puisse afficher une vue rivalité 1-to-1 sans logique métier embarquée.

#### Critères d'acceptation

```txt
- Endpoint accepte deux identifiants utilisateur (l'appelant + une cible)
- Retourne, match par match (uniquement les matchs où les 2 ont prédit) :
  - Heure et équipes du match
  - Prono utilisateur A
  - Prono utilisateur B
  - Résultat officiel (si match terminé)
  - Points gagnés par chacun
- Retourne aussi le score cumulé : "A: 47 - B: 38" sur les matchs joués
- L'appelant et la cible doivent appartenir à la même entreprise (sinon refus)
- Le calcul des points reste strictement côté backend
```

#### Vision link

```txt
Support technique de US-FE-026 (Head-to-head) —
persona Employé : "Comparer avec ses collègues" (02_user_stories.md)
```

#### Release recommandée

```txt
R5 (Polish) — dépend des leaderboards et résultats de R4
```

#### Schéma v2 — éléments concernés

- Nouvelle RPC : `get_head_to_head(other_user_id)` (`SECURITY DEFINER`)
- Vérification d'appartenance commune via `company_members`
- JOIN `predictions` (filtré sur les deux utilisateurs) ⨯ `match_results`

#### Priorité

```txt
P1
```

---


### US-BE-028 — Suppression de compte (RGPD)


En tant que backend,
je veux permettre à un utilisateur de supprimer son compte et toutes ses données,
afin de respecter le droit à l'effacement (RGPD article 17).

#### Critères d'acceptation

```txt
- Endpoint sécurisé acceptant une demande de suppression
- L'utilisateur authentifié confirme son intention
- À la suppression :
  - Le profil est supprimé
  - L'appartenance aux entreprises est supprimée
  - Les pronos sont supprimés (ou anonymisés si statistiquement utiles)
  - Le token d'authentification est invalidé
- L'opération est définitive
- Une trace minimale (sans données personnelles) peut être conservée pour audit
- Confirmation envoyée par email avant suppression effective
```

#### Vision link

```txt
RGPD article 17 — droit à l'effacement (obligation légale, marché suisse + UE)
```

#### Release recommandée

```txt
R5 (Polish) — au minimum avant mise en prod publique
```

#### Schéma v2 — éléments concernés

- Cascade DELETE déjà en place : `auth.users` → `profiles` → `company_members` + `predictions` (toutes les FK ON DELETE CASCADE)
- Endpoint déclenche : `auth.admin.deleteUser()` côté Supabase
- Pas d'impact sur `match_results` (immuables, FK uniquement vers `matches`)
- Pas de soft-delete (D-009)

#### Priorité

```txt
P0 (bloquant légal pour mise en prod)
```

---


### US-BE-029 — Quitter une Tribu


En tant que backend,
je veux permettre à un utilisateur de quitter une Tribu,
afin qu'il puisse se retirer en cas d'erreur d'adhésion ou de changement de situation.

#### Critères d'acceptation

```txt
- Endpoint accepte une demande de retrait pour l'utilisateur authentifié
- L'utilisateur n'est plus listé comme membre de la Tribu quittée
- L'utilisateur conserve toujours sa Tribu-nation de base
- Ses pronos restent intacts (l'historique de jeu n'est pas affecté)
- Le score de Tribu est recalculé sans l'utilisateur sortant
- Cas particulier — l'utilisateur est le créateur de l'entreprise :
  règle à trancher avec le PO (transmission de la propriété, refus,
  ou suppression de l'entreprise si dernier membre)
- L'opération est traçable côté backend
```

#### Vision link

```txt
Cas d'usage réel manquant : changement d'employeur, erreur d'adhésion
```

#### Release recommandée

```txt
R5 (Polish) — peut techniquement être en R2 mais pas bloquant pour la démo
```

#### Schéma v2 — éléments concernés

- DELETE simple sur `company_members` (pas de cascade)
- Les `predictions` restent intactes (FK vers `profiles`, pas vers `companies`)
- Vue `company_scores` recalcule automatiquement (D-005)
- Cas créateur : `companies.created_by` reste, mais l'utilisateur n'est plus membre — règle UX à trancher

#### Priorité

```txt
P1
```

---


## Frontend


### US-FE-026 — Comparaison head-to-head dans une Tribu


En tant qu'utilisateur,
je veux comparer mes pronos match par match avec un collègue spécifique,
afin de matérialiser une rivalité 1-to-1 au-delà du classement collectif.

#### Critères d'acceptation

```txt
- Sur le leaderboard de Tribu (US-FE-014), un tap sur un membre ouvre
  une vue comparative dédiée
- Vue mobile-first listant chaque match commun où les 2 utilisateurs ont prédit :
  - Mon prono / son prono / résultat officiel (si match terminé)
  - Indicateur visuel clair : qui a gagné le match (icône, couleur)
  - Points gagnés par chacun
- En tête de page, score cumulé : "Toi 47 - Marc 38" sur les matchs joués
- Lien retour clair vers le leaderboard de Tribu
- État vide géré : "Pas encore assez de matchs joués en commun"
- Aucun calcul côté frontend (consomme l'endpoint US-BE-027)
```

#### Pages, composants et services concernés

```txt
- pages/comparison/head-to-head/:userId
- components/h2h-match-row
- services/comparison.service
```

#### Vision link

```txt
"Comparer son score avec ses collègues" — persona Employé d'entreprise
(02_user_stories.md)
```

#### Release recommandée

```txt
R5 (Polish) — dépend de US-BE-027 et des leaderboards de R4
```

#### Priorité

```txt
P1
```

---




### US-FE-030 — Partage externe d'un rang ou d'un exploit


En tant qu'utilisateur,
je veux pouvoir partager une image sympathique de mon rang ou de mon dernier exploit,
afin d'attirer mes collègues via du brag externe (Slack, LinkedIn, WhatsApp).

#### Critères d'acceptation

```txt
- Sur le profil et après gain de points, un bouton "Partager" est disponible
- Tap → génération côté client (canvas/SVG) d'une image format social
  (1200x630 paysage ou 1080x1080 carré) contenant :
  - Pseudo de l'utilisateur
  - Rang actuel (ex: "2ème sur 87")
  - Logo / nom entreprise
  - Microcopy fun (ex: "🔥 Top performer chez Patek SA")
  - Branding minimal "Pronostic 2026"
- Sur mobile : utilisation de l'API Web Share native si disponible
  (partage direct vers Slack/WhatsApp/Messages)
- Sur desktop : bouton "Télécharger" qui sauvegarde le PNG localement
- Aucune donnée sensible dans l'image (pas d'email, pas de pseudo de tiers)
- Génération frontend uniquement au MVP (pas de service backend OG)
```

#### Pages, composants et services concernés

```txt
- pages/profile/view (bouton intégré)
- components/share-card-image (canvas de génération)
- services/share.service (utilise navigator.share si disponible)
```

#### Vision link

```txt
"Effet réseau via invitations" — 00_vision.md (élargi à la viralité externe par brag)
```

#### Release recommandée

```txt
R5 (Polish)
```

#### Priorité

```txt
P1
```

---


### US-FE-034 — Suppression de compte + mentions légales / privacy policy


En tant qu'utilisateur,
je veux pouvoir consulter la politique de confidentialité et supprimer mon compte
si je le souhaite,
afin de garder le contrôle sur mes données personnelles.

#### Critères d'acceptation

```txt
- Page dédiée "Confidentialité" accessible depuis le profil ou le pied de page
- Texte clair sur :
  - Quelles données sont collectées
  - À quoi elles servent
  - Combien de temps elles sont conservées
  - Comment exercer mes droits (accès, rectification, suppression)
- Bouton "Supprimer mon compte" sur la page profil :
  - Double confirmation explicite
    ("Cette action est irréversible. Confirmer ?")
  - Saisie du mot de passe ou re-confirmation par email
  - Feedback clair après suppression effective
- Si tracking activé (US-DO-010) : bandeau de consentement cookies
  au premier login
- Lien vers la politique de confidentialité visible depuis le pied de page
  ou la page de connexion
```

#### Pages, composants et services concernés

```txt
- pages/legal/privacy
- pages/profile/delete-account
- components/cookie-consent-banner
- services/user.service
```

#### Vision link

```txt
RGPD — obligation légale (marché suisse + UE)
Conformité indispensable pour une mise en prod
```

#### Release recommandée

```txt
R5 (Polish) — au minimum avant mise en prod publique
```

#### Priorité

```txt
P0 (bloquant légal pour mise en prod)
```

---


### US-FE-035 — Quitter une Tribu


En tant qu'utilisateur,
je veux pouvoir quitter une Tribu dans laquelle je suis,
afin de pouvoir corriger une mauvaise adhésion ou marquer un changement d'employeur.

#### Critères d'acceptation

```txt
- Bouton "Quitter cette Tribu" accessible depuis la page Tribu
  (profil ou settings)
- Confirmation explicite :
  "Tu ne feras plus partie de [Tribu]. Confirmer ?"
- Après confirmation : redirection normale vers l'app (pas d'état vide "sans entreprise")
- Mes pronos restent intacts et continuent à être comptés
  dans le classement global
- État géré dans l'UI (pas d'appel infini si déjà retiré)
```

#### Pages, composants et services concernés

```txt
- pages/profile/view ou pages/company/settings
- services/company.service
```

#### Vision link

```txt
Cas d'usage manquant du persona Employé d'entreprise (02_user_stories.md)
```

#### Release recommandée

```txt
R5 (Polish) — dépend de US-BE-029
```

#### Priorité

```txt
P1
```

---

### US-FE-039 — Back-office résultats (admin)

En tant qu'admin,
je veux un back-office dédié aux résultats,
afin de superviser la synchro et corriger les anomalies.

#### Critères d'acceptation

```txt
- L'accès est strictement réservé aux admins (US-BE-032)
- Le back-office affiche le statut API football (dernière synchro, état cron)
- Les alertes de matchs en retard (match_alerts) sont visibles
- Une correction manuelle de résultat est possible, puis recalcul automatique des points
- Le back-office est séparé de l'application joueur
```

#### Pages, composants et services concernés

```txt
- pages/admin/results
- services/admin-results.service
- services/match-alerts.service
```

#### Priorité

```txt
P1
```

---


## Data


### US-DA-012 — Détection des doublons et incohérences


**En tant que** responsable Data,
**je veux** vérifier régulièrement les données,
**afin d'** éviter les erreurs en production.

**Critères d'acceptation :**
- Aucun doublon de match
- Aucun match manquant
- Aucun score incohérent (ex: négatif, vide)
- Aucune mauvaise équipe assignée

#### Tables et fichiers de données concernés

- Tables vérifiées : `matches`, `teams`, `match_results`, `predictions`
- Scripts SQL : `data/quality_checks.sql`
- Critères : pas de doublons, pas de scores aberrants, pas de FK invalides

#### Schéma v2 — éléments concernés

- Vérifications via SQL ad-hoc sur `matches`, `teams`, `match_results`
- Pas de table d'audit (D-009)


---


## DevOps


### US-DO-009 — Logs du cron job accessibles


> En tant que développeur,
> je veux consulter les logs d'exécution du cron job de mise à jour des résultats,
> afin de vérifier que les données sont bien mises à jour après chaque match.

**Critères d'acceptance :**

- Les logs du cron job sont visibles dans le dashboard Render (rétention 7 jours)
- Chaque exécution du cron job loggue : heure de démarrage, nombre de matchs traités, nombre de scores mis à jour, durée d'exécution
- En cas d'erreur, le message d'erreur complet est loggué avec le contexte

#### Fichiers, configurations et services concernés

- Plateforme : Render dashboard (logs cron job)
- Rétention : 7 jours
- Format de log : timestamp, matchs traités, scores mis à jour, durée

> Importance : Moyenne

---


## QA


### US-QA-006 — Tests prototype final


**User Story**  
En tant qu’équipe QA, je veux valider les scénarios critiques du prototype final.

**Critères d’acceptation**
- Auth email + mot de passe fonctionnelle
- Boost = 5 (la 6e tentative est refusée)
- Pronos masqués avant verrouillage, révélés après kickoff
- Correction de résultat accessible admin-only
- Auto-join Tribu-nation au choix d'équipe
- Classement global labellisé par nation
- Notifications in-app fonctionnelles

#### Fichiers de tests et scénarios concernés

- Suite E2E : `tests/e2e/prototype-final.spec.ts`
- Scénario : auth → team pick → tribu → prono lock/unlock → leaderboard → notifications → admin correction
- Critère : aucune régression bloquante sur les parcours critiques

**Priorité** : 🔴 Critique

---

# ⬛ RELEASE R6 — Demo Readiness + Post-MVP (P2)

> **Validation finale + bonus.** Validation E2E sur device réel, scénario de démo, vérification finale des données (Data). Inclut aussi les features P2 hors-MVP (historisation, corrections admin).

---


## Backend


### US-BE-023 — Historiser les changements de pronostics


En tant que backend,  
je veux historiser les modifications de pronostics,  
afin de pouvoir auditer les changements en cas de problème.

#### Critères d’acceptation

```txt
- Chaque modification peut être tracée
- L’historique n’est pas visible dans le MVP
- Cette feature ne doit pas ralentir le développement P0
```

#### Schéma v2 — éléments concernés

- Hors MVP — table d'historique éventuelle non créée
- Si implémentée : table `predictions_history` avec append-only

#### Priorité

```txt
P2
```

---


### US-BE-024 — Créer une correction admin exceptionnelle de résultat


En tant qu’admin,  
je veux pouvoir corriger un résultat officiel,  
afin de gérer une erreur de saisie.

#### Critères d’acceptation

```txt
- Seul un admin peut corriger un résultat
- La correction recalcule les scores
- L’action doit être traçable
- Cette feature reste hors parcours utilisateur principal
```

#### Schéma v2 — éléments concernés

- RLS : seul le rôle admin peut UPDATE `match_results`
- Recalcul automatique via la vue `user_scores` (D-005)
- Action traçable côté backend (logs Supabase)

#### Priorité

```txt
P2
```

---


## Data


### US-DA-013 — Vérification finale avant démo


**En tant que** responsable Data,
**je veux** valider l'ensemble des données avant la démo,
**afin de** garantir un produit fiable.

**Critères d'acceptation :**
- Toutes les équipes présentes et correctes
- Tous les matchs présents avec phases correctes
- Scores des matchs joués exacts et à jour
- Validation croisée avec backend OK

#### Tables et fichiers de données concernés

- Tables vérifiées : les 7 tables du schéma v2
- Validation croisée avec le backend
- Checklist finale : `data/pre_demo_checklist.md`

#### Schéma v2 — éléments concernés

- Validation finale avant démo : 48 équipes, tous les matchs, scores cohérents, aucun match avec `home = away`, tous les kickoff en UTC


---


## QA


### US-QA-009 — Fiabilité en condition de démo


**User Story**  
En tant que présentateur, je veux que l’application fonctionne parfaitement en conditions réelles afin de réussir la démonstration.

**Critères d’acceptation**
- Test effectué sur device réel
- Test effectué avec réseau réel
- Scénario de démo exécuté sans erreur
- Aucun bug visible pendant la démo

#### Fichiers de tests et scénarios concernés

- Checklist manuelle : `tests/demo_checklist.md`
- Devices testés : iPhone 14 + Pixel 7 (ou équivalents)
- Réseau : 4G + WiFi
- Scénario démo : `tests/demo_scenario.md`

**Priorité** : 🔴 Critique

---

# 🛡️ COMPLÉMENTS BACKLOG — Couverture fonctionnelle & conformité

> **Pourquoi cette section existe.** L'audit du backlog (post-MOAT) révèle
> 5 trous fonctionnels et de conformité que le découpage initial par release
> n'avait pas adressés. Trois sont des oublis du parcours utilisateur (Mes pronos,
> logout, vue match terminé), deux sont des cas d'usage réels manquants
> (quitter une entreprise, suppression de compte). Ce dernier point est
> **bloquant légal** pour une mise en prod sur le marché suisse / UE :
> l'article 17 du RGPD impose le droit à l'effacement.
>
> Les 5 features se traduisent en 7 stories (les 2 features avec couplage
> backend/frontend sont scindées). Chaque story indique sa **release recommandée**
> pour intégration au plan existant.

---

### US-FE-031 — Historique

En tant qu'utilisateur,
je veux voir mon historique d'activité de pronostics en un seul endroit,
afin de suivre ma progression sur les matchs passés.

#### Critères d'acceptation

```txt
- Page dédiée "Historique" accessible depuis la navigation principale
- Liste les pronos passés de l'utilisateur, triés par date de match
  (le plus récent en haut)
- Pour chaque prono : équipes, date, mon score, statut du match
  (terminé uniquement)
- Pour les matchs terminés : afficher également le résultat officiel
  et les points gagnés
- Indicateur visuel pour les pronos boostés
- Les pronos à venir / verrouillés n'apparaissent pas dans cette vue
- État vide explicatif si aucun historique n'est disponible
- Mobile-first
- Aucun calcul côté frontend (consomme l'endpoint US-BE-019)
```

#### Pages, composants et services concernés

```txt
- pages/predictions/mine
- components/prediction-row (réutilisable)
- services/prediction.service
```

#### Vision link

```txt
"Voir ses pronos" — US-008 (02_user_stories.md, parcours utilisateur critique MVP)
```

#### Release recommandée

```txt
R3 (Matchs & Pronostics) pour la version basique, enrichie en R4
avec les résultats et points
```

#### Priorité

```txt
P1
```

---

### US-FE-032 — Déconnexion / logout

En tant qu'utilisateur,
je veux pouvoir me déconnecter de l'application,
afin de protéger mon compte sur des appareils partagés.

#### Critères d'acceptation

```txt
- Bouton "Se déconnecter" accessible depuis la page profil
- Au clic : confirmation simple ("Es-tu sûr ?") puis déconnexion effective
- Redirection vers la page de login
- Le token de session est invalidé côté serveur (pas seulement côté client)
- Aucune donnée utilisateur ne reste accessible après déconnexion
```

#### Pages, composants et services concernés

```txt
- pages/profile/view (bouton intégré)
- services/auth.service (méthode logout)
```

#### Vision link

```txt
"L'utilisateur peut se déconnecter" — US-QA-001
```

#### Release recommandée

```txt
R1 (Authentification & Profil) — complète US-FE-001 et US-BE-001/002
```

#### Priorité

```txt
P0
```

---

### US-FE-033 — Vue match terminé

En tant qu'utilisateur,
je veux voir clairement mon prono, le résultat officiel et les points gagnés
sur un match terminé,
afin de comprendre comment mon score s'est construit.

#### Critères d'acceptation

```txt
- Sur la fiche match (US-FE-007), si le match est terminé :
  - Mon prono affiché côte à côte avec le résultat officiel
  - Indicateur visuel clair : score exact / bon résultat / mauvais
  - Points gagnés sur ce match (avec bonus boost x2 si applicable)
- Si je n'ai pas fait de prono sur ce match : message explicite
  "Tu n'as pas joué ce match"
- Microcopy adaptative :
  "🎯 Score exact !" / "👍 Bon résultat" / "Pas pour cette fois"
```

#### Pages, composants et services concernés

```txt
- pages/match/detail (variante "finished")
- components/match-result-card
```

#### Vision link

```txt
"Recevoir des points / Voir mon classement" — étapes 10-11 du parcours
utilisateur critique (02_user_stories.md)
```

#### Release recommandée

```txt
R4 (Résultats, Scoring & Leaderboards) — dépend de US-BE-012 et US-BE-013
```

#### Priorité

```txt
P0
```

---

### US-BE-028 — Suppression de compte (RGPD)

En tant que backend,
je veux permettre à un utilisateur de supprimer son compte et toutes ses données,
afin de respecter le droit à l'effacement (RGPD article 17).

#### Critères d'acceptation

```txt
- Endpoint sécurisé acceptant une demande de suppression
- L'utilisateur authentifié confirme son intention
- À la suppression :
  - Le profil est supprimé
  - L'appartenance aux entreprises est supprimée
  - Les pronos sont supprimés (ou anonymisés si statistiquement utiles)
  - Le token d'authentification est invalidé
- L'opération est définitive
- Une trace minimale (sans données personnelles) peut être conservée pour audit
- Confirmation envoyée par email avant suppression effective
```

#### Vision link

```txt
RGPD article 17 — droit à l'effacement (obligation légale, marché suisse + UE)
```

#### Release recommandée

```txt
R5 (Polish) — au minimum avant mise en prod publique
```

#### Schéma v2 — éléments concernés

- Cascade DELETE déjà en place : `auth.users` → `profiles` → `company_members` + `predictions` (toutes les FK ON DELETE CASCADE)
- Endpoint déclenche : `auth.admin.deleteUser()` côté Supabase
- Pas d'impact sur `match_results` (immuables, FK uniquement vers `matches`)
- Pas de soft-delete (D-009)

#### Priorité

```txt
P0 (bloquant légal pour mise en prod)
```

---

### US-FE-034 — Suppression de compte + mentions légales / privacy policy

En tant qu'utilisateur,
je veux pouvoir consulter la politique de confidentialité et supprimer mon compte
si je le souhaite,
afin de garder le contrôle sur mes données personnelles.

#### Critères d'acceptation

```txt
- Page dédiée "Confidentialité" accessible depuis le profil ou le pied de page
- Texte clair sur :
  - Quelles données sont collectées
  - À quoi elles servent
  - Combien de temps elles sont conservées
  - Comment exercer mes droits (accès, rectification, suppression)
- Bouton "Supprimer mon compte" sur la page profil :
  - Double confirmation explicite
    ("Cette action est irréversible. Confirmer ?")
  - Saisie du mot de passe ou re-confirmation par email
  - Feedback clair après suppression effective
- Si tracking activé (US-DO-010) : bandeau de consentement cookies
  au premier login
- Lien vers la politique de confidentialité visible depuis le pied de page
  ou la page de connexion
```

#### Pages, composants et services concernés

```txt
- pages/legal/privacy
- pages/profile/delete-account
- components/cookie-consent-banner
- services/user.service
```

#### Vision link

```txt
RGPD — obligation légale (marché suisse + UE)
Conformité indispensable pour une mise en prod
```

#### Release recommandée

```txt
R5 (Polish) — au minimum avant mise en prod publique
```

#### Priorité

```txt
P0 (bloquant légal pour mise en prod)
```

---

### US-BE-029 — Quitter une Tribu

En tant que backend,
je veux permettre à un utilisateur de quitter une Tribu,
afin qu'il puisse se retirer en cas d'erreur d'adhésion ou de changement de situation.

#### Critères d'acceptation

```txt
- Endpoint accepte une demande de retrait pour l'utilisateur authentifié
- L'utilisateur n'est plus listé comme membre de la Tribu quittée
- L'utilisateur conserve toujours sa Tribu-nation de base
- Ses pronos restent intacts (l'historique de jeu n'est pas affecté)
- Le score de Tribu est recalculé sans l'utilisateur sortant
- Cas particulier — l'utilisateur est le créateur de l'entreprise :
  règle à trancher avec le PO (transmission de la propriété, refus,
  ou suppression de l'entreprise si dernier membre)
- L'opération est traçable côté backend
```

#### Vision link

```txt
Cas d'usage réel manquant : changement d'employeur, erreur d'adhésion
```

#### Release recommandée

```txt
R5 (Polish) — peut techniquement être en R2 mais pas bloquant pour la démo
```

#### Schéma v2 — éléments concernés

- DELETE simple sur `company_members` (pas de cascade)
- Les `predictions` restent intactes (FK vers `profiles`, pas vers `companies`)
- Vue `company_scores` recalcule automatiquement (D-005)
- Cas créateur : `companies.created_by` reste, mais l'utilisateur n'est plus membre — règle UX à trancher

#### Priorité

```txt
P1
```

---

### US-FE-035 — Quitter une Tribu

En tant qu'utilisateur,
je veux pouvoir quitter une Tribu dans laquelle je suis,
afin de pouvoir corriger une mauvaise adhésion ou marquer un changement d'employeur.

#### Critères d'acceptation

```txt
- Bouton "Quitter cette Tribu" accessible depuis la page Tribu
  (profil ou settings)
- Confirmation explicite :
  "Tu ne feras plus partie de [Tribu]. Confirmer ?"
- Après confirmation : redirection normale vers l'app (pas d'état vide "sans entreprise")
- Mes pronos restent intacts et continuent à être comptés
  dans le classement global
- État géré dans l'UI (pas d'appel infini si déjà retiré)
```

#### Pages, composants et services concernés

```txt
- pages/profile/view ou pages/company/settings
- services/company.service
```

#### Vision link

```txt
Cas d'usage manquant du persona Employé d'entreprise (02_user_stories.md)
```

#### Release recommandée

```txt
R5 (Polish) — dépend de US-BE-029
```

#### Priorité

```txt
P1
```

---

---

# 🌟 STORIES MOAT — Différenciation produit (compétition sociale & viralité)

> **Pourquoi cette section existe.** Le `00_vision.md` définit le vrai produit
> comme une *"battle sociale entre entreprises"* — le football est *"un prétexte"*.
> Or l'audit du backlog révèle que la couche utilitaire (auth, pronos, scoring)
> rassemble ~50 stories tandis que les piliers de différenciation
> — onboarding éclair, rivalité inter-entreprises, boucle d'invitation, statut
> ambassadeur, mesure du succès — n'en ont quasiment pas. Cette section comble
> ce déséquilibre.
>
> Chaque story indique sa **release recommandée** pour intégration dans le
> plan de livraison existant. Aucune ne va en R6 : ce sont des éléments MVP.

---

### US-FE-022 — Onboarding "30 secondes"

En tant que nouvel utilisateur,
je veux comprendre le jeu en moins de 30 secondes au premier lancement,
afin de me lancer immédiatement sans aide ni doc.

#### Critères d'acceptation

```txt
- Au premier login, 3 cards swipables (ou écran unique condensé) :
  1) "Prédis le score" — exemple visuel d'un prono
  2) "Gagne des points" — barème simple (5 / 2 / 0) + boost x2
  3) "Bats ton entreprise rivale" — preview du leaderboard entreprises
- Skippable à tout moment via "Passer"
- N'apparaît qu'une seule fois par utilisateur (flag stocké côté profil)
- Compatible mobile-first (swipe horizontal natif)
- Texte fun et bref (vision : "léger, jamais corporate rigide")
```

#### Pages, composants et services concernés

```txt
- pages/onboarding/welcome
- components/onboarding-card
- services/user.service (flag has_seen_onboarding)
```

#### Vision link

```txt
"Comprendre le jeu en moins de 30 secondes" — 00_vision.md
```

#### Release recommandée

```txt
R1 (Authentification & Profil) — juste après création du profil
```

#### Priorité

```txt
P0
```

---


### US-FE-024 — CTA d'invitation post-action (boucle virale)

En tant qu'utilisateur,
je veux pouvoir inviter un collègue dans le flux de mes actions positives,
afin que le geste soit naturel plutôt qu'un détour intentionnel.

#### Critères d'acceptation

```txt
- Après confirmation d'un prono : micro-CTA non bloquant
  "Défie un collègue sur ce match"
- Après gain de points (passage match → finished) : micro-CTA
  "Tu progresses. Invite un collègue à te suivre."
- Après franchissement d'un palier (top 10, top 3) : CTA contextuel
  "Tu es 3ème. Tes collègues savent ?"
- Le CTA réutilise share-link (US-FE-016) : un tap = lien copié + toast
- Le CTA peut être ignoré sans friction (croix discrète)
- Plafond : un même utilisateur ne voit pas plus de 1 CTA par session
  pour éviter le spam
```

#### Pages, composants et services concernés

```txt
- components/invite-cta-toast
- components/share-link (réutilisé)
- services/user.service (compteur de CTA vus par session)
```

#### Vision link

```txt
"Effet réseau via invitations" — 00_vision.md
"Si les gens invitent → énorme succès" — critère de succès projet
```

#### Release recommandée

```txt
R5 (Polish) — peut techniquement démarrer dès R3 si un prono existe
```

#### Priorité

```txt
P1
```

---


### US-DO-010 — Tracking minimal des événements clés produit

En tant qu'équipe produit,
je veux mesurer 5 événements critiques pour valider les KPI de la vision,
afin de savoir si le produit est un succès au-delà du fait qu'il fonctionne.

#### Critères d'acceptation

```txt
- 5 événements instrumentés a minima :
  - account_created          (signup réussi)
  - first_prediction_made    (premier prono soumis)
  - invite_sent              (lien copié)
  - tribu_joined             (rejoint une Tribu)
- Outillage simple : Plausible, Umami, ou table dédiée Supabase
  (pas de Mixpanel / Amplitude au MVP — overkill 3 semaines)
- Aucune donnée personnelle envoyée à un tiers (RGPD)
- Dashboard accessible (URL ou page Supabase) listant ces compteurs
- Au moment de la démo : capacité à dire "X comptes, Y pronos, Z invitations"
```

#### Vision link

```txt
"Si les gens jouent → succès / Si les gens invitent → énorme succès"
50-500 utilisateurs potentiels — 00_vision.md
```

#### Release recommandée

```txt
R5 (Polish & Démo) — instrumentable plus tôt mais utile en démo
```

#### Importance

```txt
Moyenne
```

---

#### Fichiers, configurations et services concernés

- Service tracking : à définir (PostHog, Plausible, ou équivalent simple)
- Événements clés : `signup`, `first_prediction`, `invite_sent`, `tribu_joined`, `boost_activated`, `match_predicted`
- Fichier : `src/lib/analytics.ts`
- Variables d'env : `ANALYTICS_KEY`
### US-FE-026 — Comparaison head-to-head dans une Tribu

En tant qu'utilisateur,
je veux comparer mes pronos match par match avec un collègue spécifique,
afin de matérialiser une rivalité 1-to-1 au-delà du classement collectif.

#### Critères d'acceptation

```txt
- Sur le leaderboard de Tribu (US-FE-014), un tap sur un membre ouvre
  une vue comparative dédiée
- Vue mobile-first listant chaque match commun où les 2 utilisateurs ont prédit :
  - Mon prono / son prono / résultat officiel (si match terminé)
  - Indicateur visuel clair : qui a gagné le match (icône, couleur)
  - Points gagnés par chacun
- En tête de page, score cumulé : "Toi 47 - Marc 38" sur les matchs joués
- Lien retour clair vers le leaderboard de Tribu
- État vide géré : "Pas encore assez de matchs joués en commun"
- Aucun calcul côté frontend (consomme l'endpoint US-BE-027)
```

#### Pages, composants et services concernés

```txt
- pages/comparison/head-to-head/:userId
- components/h2h-match-row
- services/comparison.service
```

#### Vision link

```txt
"Comparer son score avec ses collègues" — persona Employé d'entreprise
(02_user_stories.md)
```

#### Release recommandée

```txt
R5 (Polish) — dépend de US-BE-027 et des leaderboards de R4
```

#### Priorité

```txt
P1
```

---


### US-FE-030 — Partage externe d'un rang ou d'un exploit

En tant qu'utilisateur,
je veux pouvoir partager une image sympathique de mon rang ou de mon dernier exploit,
afin d'attirer mes collègues via du brag externe (Slack, LinkedIn, WhatsApp).

#### Critères d'acceptation

```txt
- Sur le profil et après gain de points, un bouton "Partager" est disponible
- Tap → génération côté client (canvas/SVG) d'une image format social
  (1200x630 paysage ou 1080x1080 carré) contenant :
  - Pseudo de l'utilisateur
  - Rang actuel (ex: "2ème sur 87")
  - Logo / nom entreprise
  - Microcopy fun (ex: "🔥 Top performer chez Patek SA")
  - Branding minimal "Pronostic 2026"
- Sur mobile : utilisation de l'API Web Share native si disponible
  (partage direct vers Slack/WhatsApp/Messages)
- Sur desktop : bouton "Télécharger" qui sauvegarde le PNG localement
- Aucune donnée sensible dans l'image (pas d'email, pas de pseudo de tiers)
- Génération frontend uniquement au MVP (pas de service backend OG)
```

#### Pages, composants et services concernés

```txt
- pages/profile/view (bouton intégré)
- components/share-card-image (canvas de génération)
- services/share.service (utilise navigator.share si disponible)
```

#### Vision link

```txt
"Effet réseau via invitations" — 00_vision.md (élargi à la viralité externe par brag)
```

#### Release recommandée

```txt
R5 (Polish)
```

#### Priorité

```txt
P1
```

---


### US-BE-027 — Comparaison head-to-head entre deux utilisateurs

En tant que backend,
je veux fournir la comparaison match-par-match entre deux utilisateurs,
afin que le frontend puisse afficher une vue rivalité 1-to-1 sans logique métier embarquée.

#### Critères d'acceptation

```txt
- Endpoint accepte deux identifiants utilisateur (l'appelant + une cible)
- Retourne, match par match (uniquement les matchs où les 2 ont prédit) :
  - Heure et équipes du match
  - Prono utilisateur A
  - Prono utilisateur B
  - Résultat officiel (si match terminé)
  - Points gagnés par chacun
- Retourne aussi le score cumulé : "A: 47 - B: 38" sur les matchs joués
- L'appelant et la cible doivent appartenir à la même entreprise (sinon refus)
- Le calcul des points reste strictement côté backend
```

#### Vision link

```txt
Support technique de US-FE-026 (Head-to-head) —
persona Employé : "Comparer avec ses collègues" (02_user_stories.md)
```

#### Release recommandée

```txt
R5 (Polish) — dépend des leaderboards et résultats de R4
```

#### Schéma v2 — éléments concernés

- Nouvelle RPC : `get_head_to_head(other_user_id)` (`SECURITY DEFINER`)
- Vérification d'appartenance commune via `company_members`
- JOIN `predictions` (filtré sur les deux utilisateurs) ⨯ `match_results`

#### Priorité

```txt
P1
```

---

---


# 📋 Récapitulatif par release (vertical thin slices)


## 🟦 R0 — Walking Skeleton & Foundations

- **Backend** : US-BE-001, US-BE-002, US-BE-006, US-BE-007, US-BE-009, US-BE-018
- **Frontend** : US-FE-001, US-FE-002, US-FE-006, US-FE-008, US-FE-020, US-FE-021, US-FE-PP-001, US-FE-PP-002, US-FE-PP-003, US-FE-PP-004, US-FE-PP-005, US-FE-PP-006
- **Data** : US-DA-001, US-DA-002, US-DA-003, US-DA-004, US-DA-005, US-DA-009
- **DevOps** : US-DO-001, US-DO-002, US-DO-003
- **QA** : US-QA-001

## 🟩 R1 — Solo Player Loop

- **Backend** : US-BE-008, US-BE-010, US-BE-012, US-BE-013
- **Frontend** : US-FE-007, US-FE-009, US-FE-010, US-FE-012, US-FE-031, US-FE-032, US-FE-033, US-FE-040
- **Data** : US-DA-006, US-DA-007, US-DA-008
- **DevOps** : US-DO-004, US-DO-005
- **QA** : US-QA-002, US-QA-003, US-QA-004

## 🟨 R2 — Social Battle (Tribus & Leaderboards)

- **Backend** : US-BE-003, US-BE-004, US-BE-005, US-BE-014, US-BE-015, US-BE-016, US-BE-017, US-BE-030, US-BE-031, US-BE-033
- **Frontend** : US-FE-003, US-FE-004, US-FE-005, US-FE-013, US-FE-014, US-FE-015, US-FE-016, US-FE-017, US-FE-037, US-FE-038
- **DevOps** : US-DO-006
- **QA** : US-QA-005

## 🟧 R3 — Engagement Layer

- **Backend** : US-BE-011, US-BE-019
- **Frontend** : US-FE-011, US-FE-022, US-FE-036
- **Data** : US-DA-011
- **DevOps** : US-DO-007
- **QA** : US-QA-007

## 🟥 R4 — Viral Growth Layer

- **Backend** : US-BE-020, US-BE-021, US-BE-022
- **Frontend** : US-FE-018, US-FE-019, US-FE-024
- **DevOps** : US-DO-008, US-DO-010
- **QA** : US-QA-008

## 🟪 R5 — Differentiation + Compliance

- **Backend** : US-BE-027, US-BE-028, US-BE-029, US-BE-032
- **Frontend** : US-FE-026, US-FE-030, US-FE-034, US-FE-035, US-FE-039
- **Data** : US-DA-012
- **DevOps** : US-DO-009
- **QA** : US-QA-006

## ⬛ R6 — Demo Readiness + Post-MVP (P2)

- **Backend** : US-BE-023, US-BE-024
- **Data** : US-DA-013
- **QA** : US-QA-009


# ⚠️ Anomalies à signaler (non corrigées — préservées telles quelles)

Quelques détails d’origine à noter pour vérification ultérieure (rien n’a été modifié) :

- **US-FE-011** : la priorité indiquée dans la source frontend est `P10` (probablement coquille pour `P1` ou `P0`).
- **US-DO-007** : l’endpoint `/health` mentionne `HTTP 2002` (probablement coquille pour `HTTP 200` / `2xx`).
- **US-FE-006** : la mention `(ou autre critère, à definir)` reste à clarifier avec le PO.
- **US-DO-003** : les noms de tables Supabase utilisés ici (`users`, `matchs`, `pronostics`, `scores`, `classement`, `groupes`) diffèrent du data model défini dans `03_data_model.md` (`profiles`, `matches`, `predictions`, `match_results`, `companies`, `company_members`, `teams`). À aligner.

---

---


# ✅ Definition of Done (de cette consolidation)

```txt
- Toutes les user stories des 5 équipes sont présentes
- Aucun détail d’origine n’a été supprimé ou modifié
- La numérotation suit la convention US-XX-NNN
- Les stories sont regroupées par release dans l’ordre logique de livraison
- Un récapitulatif par release permet le suivi rapide
- Les anomalies repérées sont signalées sans être corrigées
```

---
