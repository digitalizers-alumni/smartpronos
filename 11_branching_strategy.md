# 11 — Branching Strategy (GitHub)

## 🎯 Objectif

Définir une stratégie de branches **simple, claire et applicable par toute l’équipe** (humains + IA) pour garantir :

- une intégration fluide entre frontend, backend et data
- une traçabilité des features
- une livraison rapide et stable du MVP (3 semaines)

👉 Ce fichier est une **règle d’exécution**, pas une documentation décorative.

---

# 🧠 Principe clé

```txt
1 feature = 1 branche = 1 PR = 1 slice testable
```

👉 Si une branche n’est pas liée à une feature claire → elle ne doit pas exister.

---

# 🌳 Structure des branches

## Branches principales

```txt
main
  → version stable (démo)

develop
  → branche d’intégration
```

### Règles

```txt
- Aucun push direct sur main
- Toute PR passe par develop
- main = uniquement code validé et testable
```

---

# 🔄 Workflow Git

## Cycle standard

```txt
1. Créer une branche depuis develop
2. Développer la feature
3. Ouvrir une Pull Request vers develop
4. Review + tests
5. Merge dans develop
6. Quand une slice est complète → merge develop → main
```

---

# 🏷️ Convention de nommage

## Format

```txt
<type>/<scope>-<description>
```

## Types

```txt
feat   → nouvelle fonctionnalité
fix    → bug
hotfix → correction urgente
docs   → documentation
chore  → technique / infra
qa     → tests
```

## Scopes

```txt
auth
company
matches
predictions
scoring
leaderboard
mobile
data
infra
api
```

## Exemples

```txt
feat/auth-profile
feat/company-invite
feat/predictions-lock
feat/results-scoring
feat/leaderboards

backend/rpc-upsert-prediction
backend/rls-policies

data/seed-teams
data/seed-matches

qa/scoring-tests
qa/prediction-lock-tests

docs/api-contracts
chore/setup-supabase
```

👉 Interdit :

```txt
test-louis-v2-final
random-feature
wip-stuff
```

---

# 🧱 Branches par features (vertical slices)

👉 Approche recommandée : **feature complète (front + back + data)**

## MVP slices

```txt
feat/auth-profile
feat/company-invite
feat/matches-and-seed
feat/predictions-lock
feat/results-scoring
feat/leaderboards
feat/mobile-polish
```

### Contenu d’une branche

Exemple :

```txt
feat/predictions-lock

- frontend → PredictionForm
- backend → RPC upsert_prediction
- backend → lock logic
- data → matches seed compatible
- QA → tests lock + validation
```

👉 Objectif : une branche = **fonctionnalité testable de bout en bout**

---

# 📦 Pull Request (PR)

## Règles

```txt
- Une branche = une PR
- PR obligatoire (pas de merge direct)
- Review par au moins 1 personne
- La PR doit être testable
```

---

## Template PR

```md
## Description
Que fait cette PR ?

## Feature liée
feat/...

## Impact
- Frontend :
- Backend :
- Data :
- QA :

## Source of truth
- 02_user_stories.md
- 03_data_model.md
- 05_business_rules.md
- 09_api_contracts.md

## Checklist
- [ ] Fonctionne en local
- [ ] Respecte les API contracts
- [ ] Respecte les business rules
- [ ] Pas de logique métier côté frontend
- [ ] RLS respecté
- [ ] Testé avec un autre membre

## Preuves
Screenshots / logs / tests
```

---

# 🔐 Règles critiques

```txt
- Une branche doit être liée à une user story ou feature
- Aucune logique métier critique côté frontend
- Le backend est la source de vérité
- Toute modification de règle → update du context brain
- Toute modification API → update 09_api_contracts.md
```

---

# ⚡ Hotfix

## Format

```txt
hotfix/<description>
```

## Workflow

```txt
- Branch depuis main
- Fix rapide
- Merge dans main
- Merge dans develop
```

---

# 🧪 QA & validation

Une branche est validée si :

```txt
- La feature fonctionne de bout en bout
- Les règles métier sont respectées
- Les erreurs sont gérées
- Le frontend ne contourne pas le backend
- Les API contracts sont respectés
```

---

# 🚫 Anti-patterns

À éviter absolument :

```txt
- Branches trop longues (plusieurs features)
- Branches sans lien produit
- Frontend et backend développés séparément sans contrat
- Merge sans review
- Modifications API non documentées
```

---

# ✅ Definition of Done (Git)

```txt
- Chaque feature est dans une branche dédiée
- Chaque branche a une PR
- Chaque PR est reviewée
- Chaque feature est testable
- main contient uniquement du code stable
- develop contient uniquement du code intégrable
```

---

# 🧠 Rappel

```txt
Un bon Git flow accélère le projet
Un mauvais Git flow détruit la coordination
```

👉 Ici, la priorité n’est pas la perfection.
👉 La priorité est : livrer vite, sans chaos.

