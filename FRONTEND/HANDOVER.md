# SmartPronos — Handover Frontend

## Projet
Jeu de pronostics Coupe du Monde 2026. Angular 21 standalone, Supabase, Cloudflare Pages.

## Qui suis-je
Agent ayant fait la Phase 1 de refonte. Je passe la main. D'autres agents vont builder les features par-dessus.

## Ce qui a été fait (Phase 1)

### Arborescence finale
```
src/app/
├── app.ts / app.config.ts / app.routes.ts
│
├── pages/                         ← 5 pages lazy-loadées
│   ├── landing/                   ← route: /
│   ├── login/                     ← route: /login
│   ├── signup/                    ← route: /signup
│   ├── match-list/                ← route: /home/match-list
│   └── prediction-form/           ← route: /match/:matchId/prediction-form
│
├── shared/
│   ├── components/top-app-bar/    ← composant header réutilisable
│   ├── models/
│   │   ├── match.models.ts        ← MatchStatus, MatchListItem, MatchTeam, etc.
│   │   └── prediction.models.ts   ← PredictionFormValue, PredictionResponse, etc.
│   ├── utils/demo-data.ts         ← DEMO_MATCHES, DEMO_MATCH, MatchInfo
│   └── styles/
│       ├── _variables.scss        ← $spacing-*, $radius-*, $header-height
│       └── _mixins.scss           ← glass-panel, gradient-text, container
│
├── components/                    ← composants réutilisables présentationnels
│   ├── match-card/
│   ├── match-status-badge/
│   └── prediction-form/
│
├── core/
│   ├── services/
│   │   ├── supabase.service.ts    ← Client Supabase unique
│   │   └── auth.service.ts        ← signIn/signUp/signOut + currentUser Signal
│   └── guards/
│       └── auth.guard.ts          ← Protège /home/match-list et /match/:id/prediction-form
│
├── services/
│   ├── match.service.ts           ← Supabase RPC + fallback DEMO_MATCHES
│   └── prediction.service.ts      ← Supabase RPC + PredictionSubmissionError
│
└── environments/                  ← supabaseUrl, supabaseAnonKey (prod/dev)
```

### Conventions Angular adoptées
- Standalone components (pas de NgModules)
- OnPush change detection partout
- Signals (`input`, `output`, `computed`, `signal`)
- `inject()` plutôt que constructeur
- ReactiveForms avec `nonNullable.group`
- SCSS : `@use ... as *` (ou `as v` / `as m` si conflit de noms)
- Pas de suffixe `.component` (Angular 21 convention)

### Règle de décision composant vs page
- **Page** → `pages/` → routée, lazy-loadée, orchestre data + état
- **Composant** → `components/` ou `shared/components/` → présentational, inputs/outputs
- **Service** → `services/` → singleton, appelle API/Supabase

## Ce qui a été fait (Phase 2 — socle avant features)

### 1. Installer Supabase [DONE]
```bash
npm install @supabase/supabase-js
```

### 2. Créer `environments/` [DONE]
```
src/environments/environment.ts
src/environments/environment.development.ts
```
Contenu : `supabaseUrl`, `supabaseAnonKey`

### 3. Ajouter `src/environments/` à `tsconfig.app.json` [DONE]
```json
"include": ["src/**/*.ts", "src/environments/*.ts"]
```

### 4. Créer `core/services/supabase.service.ts` [DONE]
Client Supabase unique, injectable `providedIn: 'root'`.

### 5. Créer `core/services/auth.service.ts` [DONE]
Méthodes : `signUp(email, password)`, `signIn(email, password)`, `signOut()`
State : `currentUser$` (Observable ou Signal de la session)

### 6. Créer `core/guards/auth.guard.ts` [DONE]
Protège les routes connectées : `/home/match-list`, `/:matchId/prediction-form`

### 7. Brancher `LoginPage` → `AuthService` [DONE]
Remplacer `console.log` dans `submit()` par `AuthService.signIn()`

### 8. Brancher `SignupPage` → `AuthService` [DONE]
Remplacer `console.log` dans `submit()` par `AuthService.signUp()`

### 9. Refactor `match.service.ts` → Supabase RPC [DONE]
Remplacer `HttpClient.get('/api/matches')` par `supabase.rpc('get_match_list')`
Garder le fallback `DEMO_MATCHES` (déjà importé de `demo-data.ts`)

### 10. Refactor `prediction.service.ts` → Supabase RPC [DONE]
Remplacer `HttpClient.post(...)` par `supabase.rpc('upsert_prediction')`

### 11. Rediriger après auth [DONE]
Login réussi → `/home/match-list`
Signup réussi → `/home/match-list` (ou `/onboarding/profile-create` si pseudo requis)

## Pages à créer ensuite (features)
- Company : créer/rejoindre entreprise, code d'invitation
- Leaderboard : global, entreprise, inter-entreprises
- "Mes pronostics" : historique personnel
- Boost selector : un boost unique par tournoi

## Erreurs connues à éviter
- `inscription-page` n'existe plus → c'est `signup-page` maintenant
- Les routes `/match/prediction-form` et `/match/:matchId/prediction-form` sont redondantes (garder la paramétrée)
- Tous les `@use` SCSS doivent pointer vers `../../shared/styles/` pour les pages dans `pages/`
- Ne PAS recalculer le scoring côté frontend (règle projet : backend seul)
- Zone.js n'est PAS installé — le projet est zoneless, ne pas ajouter `provideZoneChangeDetection`
