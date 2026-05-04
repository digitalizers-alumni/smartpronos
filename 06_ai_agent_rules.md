# 06 — AI Agent Rules

## 🎯 Objectif

Garantir que tous les agents IA utilisés par l’équipe produisent du travail **aligné, cohérent et compatible MVP (3 semaines)**.

👉 Sans ces règles, chaque agent part dans une direction différente.

---

## 🧠 Règle fondamentale

```
Si ce n’est pas dans le Context Brain, ça n’existe pas.
```

Les agents DOIVENT se baser sur :

- 00-vision.md
- 01-product-scope.md
- 02-user-stories.md
- 03-data-model.md
- 04-design-system.md
- 05-business-rules.md
- 07-glossary.md

---

## ⚙️ Règles générales pour les agents

### 1. Respect du scope

```
- Ne jamais proposer de feature hors P0/P1 sans validation
- Ne jamais complexifier inutilement
- Toujours privilégier la solution la plus simple
```

---

### 2. Priorité MVP

```
- Code simple > code parfait
- Fonctionnel > optimisé
- Livrable > scalable
```

---

### 3. Alignement technique

```
- Stack : PWA + Supabase
- Pas de microservices
- Pas d’architecture complexe
- Pas de dépendances inutiles
```

---

### 4. Backend rules

```
- Le scoring est calculé côté backend uniquement
- Respect strict du data-model
- Ne pas dupliquer la logique métier
- Ne pas stocker des données dérivées inutiles
```

---

### 5. Frontend rules

```
- Mobile-first obligatoire
- UI simple et lisible
- Pas de logique métier critique côté frontend
- Consommer les données backend sans les recalculer
```

---

### 6. Data rules

```
- Données simples et fiables
- Pas d’automatisation fragile
- Priorité à la cohérence
```

---

## 🚫 Interdictions strictes

Les agents ne doivent jamais :

```
- Ajouter une IA de prédiction automatique
- Introduire un système de paiement
- Ajouter du temps réel complexe
- Modifier le scoring sans validation PO
- Créer de nouvelles tables sans validation
- Introduire une logique business hors context
- Générer du code non testable ou non lisible
```

---

## 🧪 Bon comportement attendu

Chaque réponse d’agent doit :

```
- Être alignée avec le context
- Être expliquée simplement
- Être directement implémentable
- Mentionner les impacts (DB, UX, règles)
```

---

## 🧠 Pattern de réponse recommandé

Quand un agent propose une solution :

```
1. Résumé de la solution
2. Impact backend
3. Impact frontend
4. Impact UX
5. Code ou pseudo-code
```

---

## ⚡ Gestion des conflits

Si un agent détecte une incohérence :

```
- Il ne décide pas seul
- Il signale le problème
- Il propose une solution simple
- Le Product Owner tranche
- Le Master of Context met à jour le brain
```

---

## 🔄 Mise à jour du contexte

```
- Toute décision produit → mise à jour context
- Toute règle métier → mise à jour 05-business-rules
- Toute structure DB → mise à jour 03-data-model
```

👉 Un agent ne modifie pas le context sans validation humaine.

---

## 🎯 Objectif final

```
- 1 seule vision produit
- 1 seule logique métier
- 1 seul modèle de données
- 1 produit cohérent
```

---

## ✅ Definition of Done

Les règles IA sont respectées si :

```
- Tous les agents produisent du code cohérent
- Aucune divergence produit n’apparaît
- Le scope reste maîtrisé
- Le projet avance sans chaos
```

---

## 🧠 Rappel

```
Un agent IA sans règles = chaos rapide
Un a