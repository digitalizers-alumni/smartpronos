# Smartpronos

Application de pronostics sportifs pour la Coupe du Monde, sans argent. Le projet est composé d'un frontend Angular et d'un backend Supabase.

La source de vérité fonctionnelle est le code. Certaines parties du frontend sont encore en mode prototype ou mockdata, notamment le classement et la page tribu.

## Structure du projet

```text
.
├── FRONTEND/                 # Application Angular 21
│   ├── src/app/              # Pages, services, composants et guards Angular
│   ├── src/environments/     # Configuration Supabase utilisée par Angular
│   ├── cypress/              # Tests Cypress actuels du frontend Angular
│   └── package.json          # Scripts frontend
├── supabase/
│   ├── migrations/           # Schéma, vues, RPC et seeds Supabase
│   └── functions/
│       └── update-scores/    # Edge Function de synchronisation des scores
├── TESTS/                    # Ancienne suite Cypress E2E orientée API backend
├── CONTEXT/                  # Schéma/documentation de contexte, non appliqué automatiquement
└── scripts/                  # Scripts utilitaires ponctuels
```

## État du setup local

Le frontend peut tourner en local avec `npm install` puis `npm start` dans `FRONTEND/`.

Il n'y a pas encore de configuration Supabase locale complète dans le repo :

- pas de `supabase/config.toml` ;
- pas de `supabase/seed.sql` ;
- les fichiers `FRONTEND/src/environments/environment.ts` et `FRONTEND/src/environments/environment.development.ts` pointent actuellement vers le projet Supabase cloud ;
- deux migrations ont actuellement le même préfixe timestamp `20260512140000`, ce qui peut bloquer ou rendre ambigu un `supabase db reset` selon la version de la CLI.

Donc, si vous lancez seulement le frontend, vous testez contre le Supabase cloud configuré dans les fichiers Angular. Pour tester des migrations avant de les pousser sur le cloud, il faut initialiser et utiliser Supabase en local.

## Prérequis

- Node.js compatible Angular 21.
- npm. Le frontend indique `npm@11.9.0` dans `FRONTEND/package.json`.
- Docker, requis par Supabase local.
- Supabase CLI, requis pour lancer la stack locale et appliquer les migrations.

Installation Supabase CLI :

```bash
npm install -g supabase
```

Vérification :

```bash
node --version
npm --version
supabase --version
docker --version
```

## Lancer le frontend en local

Depuis la racine du repo :

```bash
cd FRONTEND
npm install
npm start
```

L'application est servie sur :

```text
http://localhost:4200
```

Le script `npm start` lance `ng serve` en configuration `development`, donc Angular remplace `environment.ts` par `environment.development.ts`.

## Configuration Supabase

### Option 1 : utiliser le Supabase cloud existant

C'est l'état actuel du repo. Les fichiers suivants contiennent déjà une URL et une anon key Supabase :

```text
FRONTEND/src/environments/environment.ts
FRONTEND/src/environments/environment.development.ts
```

Attention : les modifications de migrations locales ne seront pas testées par le frontend tant que le frontend pointe vers le cloud.

### Option 2 : utiliser Supabase local pour développer les migrations

Recommandé avant de pousser de nouvelles migrations vers Supabase cloud.

Depuis la racine du repo :

```bash
supabase init
supabase start
supabase db reset
```

`supabase init` crée `supabase/config.toml`. `supabase start` lance la stack locale via Docker. `supabase db reset` applique les migrations de `supabase/migrations/` sur la base locale.

À la fin de `supabase start`, la CLI affiche les valeurs locales, par exemple :

```text
API URL: http://127.0.0.1:54321
anon key: <local-anon-key>
service_role key: <local-service-role-key>
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
```

Pour faire pointer le frontend vers Supabase local, modifier temporairement :

```text
FRONTEND/src/environments/environment.development.ts
```

Exemple :

```ts
export const environment = {
  production: false,
  supabaseUrl: 'http://127.0.0.1:54321',
  supabaseAnonKey: '<local-anon-key>',
};
```

Ne pas utiliser la `service_role key` dans le frontend. Elle doit rester côté serveur ou CLI uniquement.

Ensuite relancer :

```bash
cd FRONTEND
npm start
```

La configuration Supabase du frontend passe par les fichiers Angular :

```text
FRONTEND/src/environments/environment.ts
FRONTEND/src/environments/environment.development.ts
```

Pour le développement local, modifier `environment.development.ts`. Pour la production, modifier `environment.ts` uniquement si le projet Supabase cloud change.

## Workflow recommandé pour une migration Supabase

1. Démarrer Supabase local :

   ```bash
   supabase start
   ```

2. Créer une migration :

   ```bash
   supabase migration new nom_de_la_migration
   ```

3. Écrire le SQL dans le fichier créé sous `supabase/migrations/`.

4. Rejouer la base locale :

   ```bash
   supabase db reset
   ```

5. Faire pointer `FRONTEND/src/environments/environment.development.ts` vers Supabase local.

6. Lancer le frontend :

   ```bash
   cd FRONTEND
   npm start
   ```

7. Tester manuellement dans `http://localhost:4200`.

8. Quand la migration est validée localement, la pousser vers le projet Supabase cloud :

   ```bash
   supabase link --project-ref <project-ref>
   supabase db push
   ```

Avant `supabase db push`, vérifier que vous êtes bien linké au bon projet.

Si `supabase db reset` échoue sur les migrations, commencer par vérifier les noms dans `supabase/migrations/`. Les fichiers de migration doivent avoir des versions uniques ; actuellement `20260512140000_release_r0_backend.sql` et `20260512140000_add_team_name_fr.sql` partagent le même préfixe.

## Scripts frontend utiles

Depuis `FRONTEND/` :

```bash
npm start       # lance Angular en local sur localhost:4200
npm run build   # build de production
npm test        # tests unitaires Angular/Vitest
```

## Tests Cypress

Il y a deux suites de tests différentes.

### Tests actuels du frontend Angular

Ils sont dans :

```text
FRONTEND/cypress/
```

Ils utilisent `FRONTEND/cypress.config.ts` et visent `http://localhost:4200`.

Lancer le frontend, puis :

```bash
cd FRONTEND
npx cypress open
```

ou :

```bash
cd FRONTEND
npx cypress run
```

Note : plusieurs tests frontend utilisent des mocks Supabase dans `FRONTEND/cypress/support/supabase-mock.ts`. Ils ne prouvent donc pas toujours que la DB réelle est correctement branchée.

### Ancienne suite E2E dans `TESTS/`

Le dossier `TESTS/` contient une suite Cypress plus ancienne, orientée API backend classique (`/api/*`, `/__test__/*`, etc.).

Elle ne correspond pas entièrement à l'architecture actuelle Angular + Supabase. Ne pas l'utiliser comme preuve d'intégration locale sans réaligner les routes, les données de test et les helpers DB.

## Edge Function `update-scores`

La fonction est dans :

```text
supabase/functions/update-scores/
```

Elle synchronise les scores depuis football-data.org vers `match_results`.

Variables/secrets attendus côté Supabase :

- `FOOTBALL_DATA_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `ALERT_EMAIL_TO`
- `ALERT_EMAIL_FROM`

Voir aussi :

```text
supabase/functions/update-scores/README.md
```

## Points d'attention connus

- Le classement frontend est encore mocké dans `FRONTEND/src/app/pages/leaderboard/leaderboard-page.ts`.
- La page tribu est encore mockée dans `FRONTEND/src/app/pages/company/company-page.ts`.
- `MatchService` appelle bien `get_match_list` et affiche maintenant une erreur front si Supabase ou la RPC ne répond pas.
- Les RPC `get_global_leaderboard`, `get_company_leaderboard` et `get_companies_leaderboard` existent dans `CONTEXT/03.schema.sql`, mais pas dans les migrations Supabase actuelles.
- Les migrations seedent les équipes et les 72 matchs de groupes. Les phases finales sont encore à compléter.

## Onboarding rapide

Pour un collaborateur qui veut simplement lancer l'app :

```bash
git clone <repo-url>
cd smartpronos
cd FRONTEND
npm install
npm start
```

Pour un collaborateur qui doit modifier la DB :

```bash
git clone <repo-url>
cd smartpronos
supabase init
supabase start
supabase db reset
```

Puis configurer `FRONTEND/src/environments/environment.development.ts` avec l'URL et l'anon key locales affichées par `supabase start`, puis lancer :

```bash
cd FRONTEND
npm install
npm start
```
