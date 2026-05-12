# SmartProno — Tests E2E (Cypress)

Tests end-to-end couvrant les user stories de qualité (US-QA-*).

> Branche `QA` — premier spec migré : **US-QA-002** (Création de prono), en TypeScript.

---

## Architecture

```
TESTS/
├── package.json                  Scripts npm & dépendances
├── tsconfig.json                 Config TS (strict, types Cypress + Node)
├── cypress.config.js             Config Cypress + tâches Node (db:reset, …)
├── cypress.env.json              Constantes partagées (barème, lockout, …)
│
├── US_QA_002.cy.ts               ✅ Création de prono (14 tests)
│
└── cypress/
    ├── plugins/
    │   └── db.js                 Implémentation Node des tâches DB (admin /__test__/*)
    └── support/
        ├── e2e.js                Point d'entrée (charge commands.js)
        ├── commands.js           Commandes custom (cy.resetDb, cy.loginViaApi, …)
        └── index.d.ts            Déclarations TS pour les commandes custom
```

### Specs prévus (à migrer)

| Spec | Statut | Critères |
|---|---|---|
| US-QA-001 — Authentification | ⏳ | Inscription, connexion, validation, déconnexion |
| **US-QA-002 — Création de prono** | ✅ TS | Sélection match, saisie score, validation, anti-bypass |
| US-QA-003 — Modification de prono | ⏳ | Pré-remplissage, lockout pré-kickoff, sécurité |
| US-QA-004 — Calcul des points | ⏳ | Score exact (5), bon résultat (2), 0, recalcul |
| US-QA-005 — Classement | ⏳ | Tri, ex-aequo, cohérence inter-users |
| US-QA-006 — Parcours complet | ⏳ | Smoke E2E (inscription → … → déconnexion) |
| US-QA-007 — Résilience | ⏳ | Multi-clics, refresh, XSS, SQL injection |
| US-QA-008 — Qualité UI/UX | ⏳ | Liens, lisibilité, responsive (6 viewports) |
| US-QA-009 — Démo | ⏳ | Scénario complet sur 2 viewports, réseau dégradé |

---

## Démarrage rapide

```bash
cd TESTS
npm install

# Lancer le backend SmartProno en NODE_ENV=test (voir « Prérequis backend »)

npm run cy:open          # mode interactif
npm run test:us002       # juste le spec US-QA-002
```

---

## Prérequis backend

Le backend SmartProno doit exposer un module de **routes admin de test**, monté
uniquement quand `NODE_ENV=test` et protégé par un header `X-Test-Token` :

| Méthode | URL | Rôle |
|---|---|---|
| `POST` | `/__test__/reset` | TRUNCATE des tables applicatives |
| `POST` | `/__test__/seed` | INSERT du jeu de référence (1 user + 2 matchs) |
| `POST` | `/__test__/users` | INSERT user arbitraire |
| `POST` | `/__test__/users/:email/points` | UPSERT du total de points |
| `POST` | `/__test__/pronos` | INSERT prono (bypass validation métier) |
| `POST` | `/__test__/matches` | INSERT match arbitraire |
| `POST` | `/__test__/matches/:id/status` | UPDATE statut (open / closed / live) |
| `POST` | `/__test__/matches/:id/kickoff` | UPDATE coup d'envoi |
| `POST` | `/__test__/matches/:id/result` | UPDATE score final + scoring **synchrone** |

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

## US-QA-002 — Détail des tests

Le spec couvre **explicitement** les 6 critères d'acceptation de la user story
(`CONTEXT/02_user_stories_by_release_v2.md` §US-QA-002).

| Critère | Tests |
|---|---|
| 1. L'utilisateur peut sélectionner un match | 2 |
| 2 + 3 + 4. Saisie score + enregistrement + confirmation | 2 |
| 5. Impossible d'envoyer un prono vide | 3 |
| 6. Les valeurs invalides sont bloquées ou gérées | 4 |
| Bonus — Match déjà démarré (anti-bypass) | 2 |
| Bonus — Mise à jour d'un prono existant | 1 |
| **Total** | **14** |

### Hypothèses front (à respecter côté Angular)

- Routes : `/pronos/new` (création), `/pronos` (liste)
- Sélecteurs `data-cy=*` :
  - `match-select`, `score-home-input`, `score-away-input`, `submit-prono`
  - `prono-success`, `prono-error`
  - `score-home-error`, `score-away-error`, `match-select-error`
  - `prono-card` (avec attribut `data-cy-match-id="..."`)
- API : `POST /api/pronos`, `PUT /api/pronos/:id`

---

## Conventions

- **Spec par US** : un fichier `US_QA_NNN.cy.ts` par user story de qualité.
- **`data-cy` partout** : aucun `cy.get(".my-class")` ni `cy.contains("…")`.
- **Pas de `cy.wait(ms)`** sauf timing délibéré. Préférer `cy.wait("@alias")`.
- **Isolation** : chaque test doit pouvoir tourner seul. `before`/`beforeEach`
  préparent l'état, jamais d'enchaînement implicite entre `it`.
- **Pas de `.only` / `.skip` commit**.

---

## Ressources

- [Cypress docs](https://docs.cypress.io/)
- [cy.session()](https://docs.cypress.io/api/commands/session)
- [Best Practices Cypress](https://docs.cypress.io/guides/references/best-practices)
