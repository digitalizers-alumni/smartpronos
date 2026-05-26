# SmartProno — Tests E2E (Cypress + TypeScript)

Tests end-to-end couvrant les 9 user stories de qualité (US-QA-001 à 009) :
authentification, pronos, calcul de points, classement, résilience,
UI/UX, et scénario de démo.

**~150 tests** sur **9 specs** TypeScript, **4 niveaux d'exécution**
(smoke / full / nightly / demo). Branche : `QA`.

---

## Sommaire

- [Architecture](#architecture)
- [Démarrage rapide](#démarrage-rapide)
- [Prérequis backend](#prérequis-backend)
- [Lancer les tests](#lancer-les-tests)
- [Couverture par user story](#couverture-par-user-story)
- [Conventions](#conventions)
- [Troubleshooting](#troubleshooting)

---

## Architecture

```
TESTS/
├── package.json                  Scripts npm & dépendances
├── tsconfig.json                 Config TS (strict, types Cypress + Node)
├── cypress.config.js             Config Cypress + tâches Node (db:reset, …)
├── cypress.env.json              Constantes partagées (barème, lockout, …)
│
├── US_QA_001.cy.ts               Authentification
├── US_QA_002.cy.ts               Création de prono
├── US_QA_003.cy.ts               Modification de prono
├── US_QA_004.cy.ts               Calcul des points
├── US_QA_005.cy.ts               Classement
├── US_QA_006.cy.ts               Parcours utilisateur complet (smoke)
├── US_QA_007.cy.ts               Résilience (multi-clics, refresh, XSS, …)
├── US_QA_008.cy.ts               Qualité UI/UX (responsive, perf)
├── US_QA_009.cy.ts               Fiabilité en condition de démo
│
└── cypress/
    ├── plugins/
    │   └── db.js                 Implémentation Node des tâches DB
    └── support/
        ├── e2e.js                Point d'entrée (charge commands.js)
        ├── commands.js           Commandes custom (cy.loginViaApi, …)
        └── index.d.ts            Déclarations TS pour les commandes custom
```

### Patterns clés

| Pattern | Où | Pourquoi |
|---|---|---|
| `cy.session()` | `commands.js → loginViaApi` | Évite de rejouer l'UI de login à chaque test (gain ~80% du temps) |
| Routes admin `/__test__/*` | `cypress/plugins/db.js` | Permet de préparer/réinitialiser la DB sans dupliquer l'accès direct côté tests |
| `data-cy` sélecteurs | Partout | Découple les tests du markup et des libellés |
| Tâches Node `cy.task()` | `cypress.config.js` | Bypass de la validation métier pour préparer des états impossibles via l'API publique |
| Tests paramétrés (`forEach`) | US-004, US-008, US-009 | Couverture exhaustive sans dupliquer du code |
| Types stricts | `index.d.ts` + interfaces locales | Sécurise les payloads d'API et les commandes custom |

---

## Démarrage rapide

```bash
cd TESTS
npm install

# Démarrer le backend SmartProno en NODE_ENV=test (voir « Prérequis backend »)

npm run cy:open          # mode interactif (recommandé en dev)
npm run test:smoke       # US-001 + US-006 (~10 min)
npm run typecheck        # vérification TS sans build
```

---

## Prérequis backend

Le backend SmartProno doit exposer un module de **routes admin de test**, monté
uniquement quand `NODE_ENV=test` et protégé par un header `X-Test-Token`.
**Sans ce module, aucun spec ne tournera.**

### Endpoints requis

| Méthode | URL | Rôle | Spec(s) qui l'utilisent |
|---|---|---|---|
| `POST` | `/__test__/reset` | TRUNCATE de toutes les tables applicatives | tous |
| `POST` | `/__test__/seed` | INSERT du jeu de référence (1 user, 2 matchs) | tous |
| `POST` | `/__test__/users` | INSERT user arbitraire | 003, 004, 005, 009 |
| `POST` | `/__test__/users/:email/points` | UPSERT du total de points (bypass scoring) | 005, 009 |
| `POST` | `/__test__/pronos` | INSERT prono (bypass validation métier) | 003, 004 |
| `POST` | `/__test__/matches` | INSERT match arbitraire | 004 |
| `POST` | `/__test__/matches/:id/status` | UPDATE statut (open / closed / live) | 003 |
| `POST` | `/__test__/matches/:id/kickoff` | UPDATE coup d'envoi | 003 |
| `POST` | `/__test__/matches/:id/result` | UPDATE score final + déclenche scoring **synchrone** | 004, 006, 009 |

### Variables d'environnement

```bash
# Backend
NODE_ENV=test
DATABASE_URL=postgres://localhost/smartprono_test
CYPRESS_TEST_TOKEN=<un-secret-long-et-aléatoire>

# Cypress runner
CYPRESS_BASE_URL=http://localhost:3000
BACKEND_URL=http://localhost:3000
CYPRESS_TEST_TOKEN=<le-même-token>
```

---

## Lancer les tests

### En local

```bash
npm run cy:open                  # mode interactif
npm run cy:run                   # tout en headless
npm run test:smoke               # US-001 + US-006 (~10 min)
npm run test:full                # US-001 à 008 (~25 min)
npm run test:nightly             # full × 3 navigateurs (~50 min)
npm run test:demo                # US-009 uniquement
npm run test:perf                # US-008
npm run test:resilience          # US-007
npm run test:us00X               # un spec en particulier (X = 1..9)
```

### Surcharger une variable d'env

```bash
npx cypress run --env POINTS_EXACT=3,PRONO_LOCKOUT_MINUTES=15
```

### Type-check sans lancer Cypress

```bash
npm run typecheck
```

---

## Couverture par user story

| Spec | Tests | Critères couverts |
|---|---|---|
| US-001 Authentification | 6 | Inscription, connexion, validation, déconnexion, erreurs |
| US-002 Création prono | 14 | Sélection match, saisie scores, validation, anti-bypass match fermé |
| US-003 Modification prono | 21 | Pré-remplissage, persistance, lockout pré-kickoff, sécurité, historique |
| US-004 Calcul des points | 24 | Score exact (5), bon résultat (2), 0, idempotence, recalcul, anti-triche |
| US-005 Classement | 14 | Tri, ex-aequo, mise à jour, cohérence inter-users, cas limites |
| US-006 Parcours complet | 2 | Smoke E2E inscription → … → déconnexion, sans 4xx/5xx |
| US-007 Résilience | 22 | Multi-clics, refresh, XSS, SQL injection, navigation rapide, erreurs réseau |
| US-008 Qualité UI/UX | ~60 | Liens valides, lisibilité, responsive (6 viewports × 7 pages), performances |
| US-009 Démo | 6 | Scénario complet sur 2 viewports avec réseau dégradé + screenshots |
| **Total** | **~170** | |

---

## Conventions

- **Spec par US** : un fichier `US_QA_NNN.cy.ts` par user story de qualité.
- **TypeScript strict** : types explicites sur les payloads, helpers et callbacks.
- **`data-cy` partout** : aucun `cy.get(".my-class")` ni `cy.contains("Connexion")`.
- **Pas de `cy.wait(ms)`** sauf si on veut **délibérément** observer un timing
  (ex. US-003 historique). Toujours préférer `cy.wait("@alias")` ou des
  assertions retry-friendly.
- **Isolation** : chaque test doit pouvoir tourner **seul**. `before` /
  `beforeEach` préparent l'état, jamais d'enchaînement implicite entre `it`.
- **Pas de `.only` / `.skip` commit** (lint rule `mocha/no-exclusive-tests`
  recommandée).

### Hypothèses front (à respecter côté Angular)

Routes attendues :
- `/login`, `/signup`, `/dashboard`
- `/pronos`, `/pronos/new`, `/pronos/:matchId/edit`
- `/leaderboard`, `/profile`

Sélecteurs `data-cy=*` attendus :
- Auth : `signup-link`, `login-link`, `email-input`, `password-input`,
  `submit-button`, `welcome-message`, `error-message`, `logout-button`
- Prono : `match-select`, `score-home-input`, `score-away-input`,
  `submit-prono`, `cancel-prono`, `prono-success`, `prono-error`,
  `score-home-error`, `score-away-error`, `match-select-error`,
  `prono-card[data-cy-match-id]`, `edit-prono`, `prono-locked`,
  `prono-history-toggle`, `prono-history-entry`
- Profil / classement : `user-total-points`, `match-points[data-cy-match-id]`,
  `leaderboard-row[data-cy-current-user]`, `my-rank`
- Layout : `main-nav`, `burger-menu`, `nav-*`

API attendue :
- `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/pronos`, `PUT /api/pronos/:matchId`, `DELETE /api/pronos/:matchId`
- `GET /api/pronos`, `GET /api/pronos/:matchId/history`
- `GET /api/users/me/points`, `GET /api/users/count`
- `GET /api/leaderboard`

---

## Troubleshooting

### `cy.task("db:reset")` échoue avec « Refus d'opérer »

`db.js` refuse de tourner si `NODE_ENV !== "test"` ou si `DATABASE_URL`
contient "prod". Vérifier les deux variables côté backend ET côté Cypress runner.

### Les tests d'auth passent mais ceux qui utilisent `cy.loginViaApi` échouent

`cy.session()` est cachée entre tests. Si vous changez le mot de passe de
`registered_user` côté seed, invalidez les sessions :

```typescript
Cypress.session.clearAllSavedSessions()
```

### `cy.intercept` ne capture rien

`cy.intercept()` doit être appelé **avant** la requête. Si l'app fait sa
requête au montage d'un composant, mettre l'intercept **avant** `cy.visit()`.

### Tests flaky en CI mais OK en local

1. **Scoring asynchrone côté backend** → exposer un mode "scoring sync en
   `NODE_ENV=test`", ou poller :

   ```typescript
   cy.waitUntil(() => getPointsForMatch(m).then(p => p === 5))
   ```

2. **Animations / transitions CSS** → désactiver en test :

   ```css
   *, *::before, *::after { transition: none !important; animation: none !important; }
   ```

3. **Timezone différente entre runner et app** → `TZ=Europe/Paris` dans la CI.

### TypeScript : commande custom non reconnue

Vérifier que la commande est bien déclarée dans `cypress/support/index.d.ts`
(interface `Cypress.Chainable`).

---

## Ressources

- [Cypress docs](https://docs.cypress.io/)
- [cy.session()](https://docs.cypress.io/api/commands/session)
- [Best Practices Cypress](https://docs.cypress.io/guides/references/best-practices)
- [Cypress + TypeScript](https://docs.cypress.io/guides/tooling/typescript-support)
