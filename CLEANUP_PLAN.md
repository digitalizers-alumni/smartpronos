# Plan de cleanup et branchement DB

Objectif : terminer le projet en supprimant les mockdata du frontend, en complétant la DB locale si nécessaire, puis en validant que tout le frontend est branché sur Supabase.

Ce plan part du principe que :

- Supabase local démarre correctement.
- Le frontend Angular tourne avec `npm start`.
- Les migrations locales ont été réalignées depuis l'historique cloud.
- Le projet Supabase cloud est considéré jetable si un reset complet devient nécessaire.

## Étape 0 — Stabiliser la base locale

1. Vérifier que le reset local passe :

   ```bash
   npx supabase db reset
   ```

2. Vérifier dans Supabase Studio local que les tables principales existent :

   - `profiles`
   - `companies`
   - `company_members`
   - `teams`
   - `matches`
   - `predictions`
   - `match_results`
   - `match_alerts`

3. Vérifier que les RPC principales existent :

   - `get_match_list`
   - `upsert_prediction`
   - `get_user_profile`
   - `set_favorite_team`
   - `delete_my_account`
   - `get_global_leaderboard`
   - `get_company_leaderboard`
   - `get_companies_leaderboard`

## Étape 1 — Aligner le front avec le contrat DB actuel

Le RPC `get_match_list` local/cloud renvoie plus de champs que le type frontend actuel.

À faire :

1. Mettre à jour `MatchListRpcRow` dans `FRONTEND/src/app/services/match.service.ts`.
2. Ajouter les champs renvoyés par la DB :

   - `fifa_match_number`
   - `group_name`
   - `venue_city`
   - `venue_stadium`
   - `venue_country`
   - `local_kickoff_time`
   - `local_timezone`
   - `points_earned`

3. Mapper ces champs vers `MatchListItem`.
4. Vérifier que les pages suivantes continuent de fonctionner :

   - `match-list`
   - `match-detail`
   - `prediction-form`

5. Décider si le front affiche `teams.name` ou `teams.name_fr`.

   Recommandation : modifier la RPC pour retourner `coalesce(name_fr, name)` pour les noms affichés.

## Étape 2 — Supprimer le fallback runtime `DEMO_MATCHES`

Aujourd'hui, si Supabase échoue, `MatchService` affiche des faux matchs.

À faire :

1. Retirer le fallback `return of(DEMO_MATCHES)` dans `MatchService`.
2. Remplacer par une vraie erreur ou un état vide contrôlé.
3. Garder `DEMO_MATCHES` uniquement pour tests/fixtures si nécessaire.
4. Vérifier que les pages qui consomment les matchs gèrent bien l'erreur.

## Étape 3 — Brancher la page Classement

Actuellement, `FRONTEND/src/app/pages/leaderboard/leaderboard-page.ts` est hardcodé.

DB disponible :

- `get_global_leaderboard`
- `get_company_leaderboard(p_company_id)`
- `get_companies_leaderboard`
- `current_user_profile`

À faire :

1. Créer `FRONTEND/src/app/services/leaderboard.service.ts`.
2. Implémenter :

   - `getGlobalLeaderboard()`
   - `getMyCompanyLeaderboard(companyId)`
   - `getCompaniesLeaderboard()`

3. Adapter les interfaces frontend :

   - joueur : `rank`, `user_id`, `username`, `total_points`, `exact_count`
   - tribu : `rank`, `company_id`, `name`, `member_count`, `active_member_count`, `avg_points`, `total_points`

4. Dans `LeaderboardPage`, remplacer :

   - `GLOBAL_LB`
   - `COMPANY_MEMBERS`
   - `COMPANIES`
   - `userRank`
   - `userTotalPlayers`

5. Ajouter des états `loading`, `error` et `empty`.
6. Marquer l'utilisateur courant avec `AuthService.currentUser()?.id`.

## Étape 4 — Brancher la page Tribu

Actuellement, `FRONTEND/src/app/pages/company/company-page.ts` et son template sont hardcodés.

DB disponible partielle :

- `current_user_profile`
- `company_members_with_scores`
- `company_scores`
- `company_invite_info`
- `create_company`
- `join_company_by_invite_code`

Manques probables :

- `leave_company`
- éventuellement `get_my_company_dashboard`
- éventuellement `get_my_company_leaderboard`

À faire :

1. Créer `FRONTEND/src/app/services/company.service.ts`.
2. Implémenter la lecture :

   - profil courant + company courante
   - membres de la company
   - score/rang de la company
   - invite code / member count

3. Remplacer dans `CompanyPage` :

   - `ACTIVE_MEMBERS`
   - `tribeName`
   - `memberCount`
   - `tribeRank`
   - `rivalName`
   - le toggle `Mode démo`

4. Brancher les boutons :

   - créer une tribu
   - rejoindre via code/lien
   - inviter
   - quitter, si une RPC `leave_company` est ajoutée

5. Ajouter un empty state réel si l'utilisateur n'a pas de tribu.

## Étape 5 — Compléter la DB pour Tribu

À décider après l'intégration minimale de la page Tribu.

Statut : implémenté via migration `20260602093000_company_dashboard_rpcs.sql`.

Migrations probables :

1. Ajouter `leave_company(p_company_id uuid)`.
2. Ajouter `get_my_company_dashboard()` qui retourne :

   - company courante
   - invite code
   - member count
   - rang global de la tribu
   - rival au-dessus

3. Éventuellement ajouter `get_my_company_leaderboard()` sans paramètre, pour éviter que le front manipule directement `company_id`.

Objectif : simplifier le front et centraliser la logique de classement/rival côté DB.

## Étape 6 — Refonte logique `company` vers `tribe`

Le produit ne distingue plus plusieurs types de tribus. Une tribu est simplement un groupe nommé, sans notion de tribu officielle d'entreprise vs groupe friends-only.

Objectif : supprimer le reliquat conceptuel `company` là où il crée de la confusion, et exposer l'UX sous `/tribe` au lieu de `/company`.

Statut : implémenté côté frontend et alias DB via migration `20260602094500_tribe_alias_rpcs.sql`.

Décision prise : garder temporairement les tables/vues historiques `companies` / `company_members` pour éviter une migration physique risquée, mais exposer au front des noms `tribe` via une nouvelle page, un nouveau service, une nouvelle route et des RPC/vues alias.

Constat actuel :

- La route frontend est maintenant `/tribe`.
- `/company` redirige temporairement vers `/tribe`.
- La page est maintenant dans `FRONTEND/src/app/pages/tribe/`.
- Le service frontend s'appelle maintenant `TribeService`.
- Les tables/vues internes DB utilisent encore le vocabulaire `companies`, `company_members`, `company_scores`, etc.
- Le template affiche seulement `Tribu`.
- Le leaderboard utilise maintenant des noms techniques `tribes` pour l'onglet `Tribus`.

À faire côté frontend :

1. Renommer la route :

   - `path: 'company'` devient `path: 'tribe'`.
   - Les liens `/company` deviennent `/tribe`.
   - Ajouter éventuellement une redirection temporaire `/company -> /tribe` pour ne pas casser les bookmarks pendant la transition.

2. Renommer les fichiers/classes si on veut nettoyer complètement :

   - `pages/company/` -> `pages/tribe/`
   - `CompanyPage` -> `TribePage`
   - `company-page.ts/html` -> `tribe-page.ts/html`
   - `CompanyService` -> `TribeService`

3. Nettoyer les libellés UI :

   - retirer `Tribu d'entreprise`;
   - garder seulement `Tribu`;
   - retirer toute notion de type `company` vs `group`;
   - conserver l'unicité du nom comme seule règle métier.

4. Nettoyer les noms frontend internes :

   - `currentCompany` -> `currentTribe`
   - `companyMembers` -> `tribeMembers`
   - `companiesLeaderboard` -> `tribesLeaderboard`
   - `company_id` peut rester temporairement si la DB n'est pas renommée dans la même étape.

À faire côté DB :

1. Décider si on renomme réellement les tables/RPC ou si on garde les noms DB historiques.

   Option conservatrice recommandée : garder `companies` / `company_members` en DB pour éviter une grosse migration risquée, mais créer des RPC/vues alias avec vocabulaire `tribe`.

2. Si on garde les tables existantes, ajouter progressivement des alias DB :

   - `get_tribes_leaderboard()` alias de `get_companies_leaderboard()`
   - `get_my_tribe_leaderboard()` alias de `get_my_company_leaderboard()`
   - `get_my_tribe_dashboard()` alias de `get_my_company_dashboard()`
   - `create_tribe(p_name text)` alias de `create_company(p_name)`
   - `join_tribe_by_invite_code(p_invite_code text)` alias de `join_company_by_invite_code(p_invite_code)`
   - `leave_tribe(p_tribe_id uuid)` alias de `leave_company(p_company_id)`

3. Si on décide de renommer physiquement les tables, le faire dans une étape dédiée plus tard :

   - `companies` -> `tribes`
   - `company_members` -> `tribe_members`
   - adapter toutes les vues/RPC/policies/grants
   - vérifier toutes les migrations depuis zéro avec `npx supabase db reset`

Recommandation : commencer par la route `/tribe` et les renommages frontend visibles, puis ajouter des alias RPC `tribe_*`. Reporter le rename physique des tables tant que l'app fonctionne.

Implémentation réalisée :

- `FRONTEND/src/app/app.routes.ts` expose `/tribe` et redirige `/company` vers `/tribe`.
- `FRONTEND/src/app/app.html` et `bottom-nav.ts` pointent vers `/tribe`.
- `FRONTEND/src/app/pages/company/` a été remplacé par `FRONTEND/src/app/pages/tribe/`.
- `CompanyService` a été remplacé par `TribeService`.
- Les actions front utilisent maintenant `create_tribe`, `join_tribe_by_invite_code`, `leave_tribe` et `get_tribes_leaderboard`.
- Le leaderboard utilise `get_tribes_leaderboard` et `get_my_tribe_leaderboard`.
- Le badge `Tribu d'entreprise` et l'icône `verified` ont été retirés.

Occurrences déjà identifiées :

- `FRONTEND/src/app/app.routes.ts`
- `FRONTEND/src/app/app.html`
- `FRONTEND/src/app/shared/components/bottom-nav/bottom-nav.ts`
- `FRONTEND/src/app/pages/company/`
- `FRONTEND/src/app/services/company.service.ts`
- `FRONTEND/src/app/pages/leaderboard/leaderboard-page.ts`
- `FRONTEND/src/app/services/leaderboard.service.ts`
- `supabase/migrations/*company*.sql`
- `supabase/migrations/20260602093000_company_dashboard_rpcs.sql`

## Étape 7 — Corriger les noms d'équipes

La DB a `teams.name_fr`, mais plusieurs RPC/services renvoient encore `name`.

À faire :

1. Modifier `get_match_list` pour retourner `coalesce(ht.name_fr, ht.name)` et `coalesce(at.name_fr, at.name)`.
2. Modifier `TeamService.getTeams()` :

   - soit sélectionner `name_fr`
   - soit exposer `name: name_fr`

3. Modifier `get_user_profile` pour retourner `favorite_team_name` en français.

## Étape 8 — Nettoyer les tests

À faire après branchement frontend :

1. Corriger `FRONTEND/cypress/e2e/us-qa-005-leaderboard.cy.ts`, qui teste encore les faux noms.
2. Décider si les tests Cypress restent mockés ou deviennent des tests d'intégration Supabase local.
3. Archiver ou documenter `TESTS/` comme ancienne suite non alignée.

## Étape 9 — Validation locale complète

1. Reset DB locale :

   ```bash
   npx supabase db reset
   ```

2. Lancer le frontend :

   ```bash
   cd FRONTEND
   npm start
   ```

3. Créer plusieurs utilisateurs localement.
4. Créer et rejoindre une tribu.
5. Faire des pronostics.
6. Poser des résultats via SQL ou RPC `set_match_result`.
7. Vérifier :

   - points profil
   - classement global
   - classement tribu
   - classement des tribus
   - page tribu
   - match list
   - match detail
   - prediction form

## Étape 10 — Push cloud et PR

Quand tout est OK local :

1. Vérifier une dernière fois les migrations :

   ```bash
   npx supabase db reset
   ```

2. Linker le projet cloud :

   ```bash
   npx supabase link --project-ref ttrgqgxmkeunwpraqhsd
   ```

3. Comme le cloud est considéré jetable, décider entre :

   - reset cloud complet puis push du nouvel historique ;
   - push incrémental si l'historique cloud et local sont alignés.

4. Appliquer les migrations cloud :

   ```bash
   npx supabase db push
   ```

5. Vérifier que `FRONTEND/src/environments/environment.development.ts` est dans l'état attendu pour la PR.
6. Push la branche de dev.
7. Ouvrir une PR vers `main`.

## Ordre de travail recommandé

1. Étape 0 : valider le reset DB local.
2. Étape 1 : aligner le contrat matchs.
3. Étape 2 : supprimer le fallback `DEMO_MATCHES`.
4. Étape 3 : brancher le classement.
5. Étape 4 : brancher la page tribu.
6. Étape 5 : compléter la DB tribu si nécessaire.
7. Étape 6 : refonte logique `company` vers `tribe`.
8. Étape 7 : uniformiser les noms français.
9. Étape 8 : nettoyer les tests.
10. Étape 9 : validation locale complète.
11. Étape 10 : push cloud et PR.
