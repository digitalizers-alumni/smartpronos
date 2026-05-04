# 08 — Decisions Log (Journal des décisions)

## 🎯 Objectif

Tracer **toutes les décisions importantes** du projet afin de :

- garder un historique clair
- éviter les débats répétitifs
- comprendre le “pourquoi” des choix
- aligner toute l’équipe (humains + agents IA)

👉 Si une décision impacte le produit, la data ou les règles, elle doit être loggée ici.

---

## 🧠 Règle d’or

```
Une décision non documentée = une décision qui sera remise en question.
```

---

## 🧱 Format standard d’une décision

```md
## D-XXX — [Titre court]

### Date
YYYY-MM-DD

### Contexte
Pourquoi on devait décider

### Décision
Choix retenu (clair et actionnable)

### Alternatives considérées
- Option A
- Option B

### Pourquoi ce choix
Raisonnement (simplicité, délai, impact, etc.)

### Impact
- Backend
- Frontend
- UX
- Data
- QA

### Statut
Proposée | Validée | Implémentée | Obsolète

### Liens
- PR / commit
- Fichiers context mis à jour
```

---

## 🗂️ Index des décisions

- D-001 — Scoring MVP
- D-002 — Règle de boost (1 par utilisateur)
- D-003 — Verrouillage à T-15 minutes
- D-004 — Score entreprise = moyenne des membres

---

## 📌 Décisions

### D-001 — Scoring MVP

**Date** : 2026-05-04

**Contexte** : Définir un système simple et compréhensible en 30 secondes.

**Décision** :
- Score exact → 5 pts
- Bon résultat (1N2) → 2 pts
- Mauvais → 0 pt

**Alternatives** :
- Système de points plus granulaire
- Bonus par écart de buts

**Pourquoi** :
Simplicité maximale, facile à expliquer et à tester.

**Impact** :
- Backend : logique de scoring
- Frontend : affichage des points
- QA : cas de test simples

**Statut** : Validée

---

### D-002 — Règle de boost (1 par utilisateur)

**Date** : 2026-05-04

**Contexte** : Ajouter un levier fun sans complexifier.

**Décision** :
- 1 boost par utilisateur sur tout le tournoi
- Multiplicateur x2

**Alternatives** :
- 1 boost par journée
- Boosts multiples

**Pourquoi** :
Limiter la complexité et les abus.

**Impact** :
- Backend : champ `is_boosted`
- UX : choix stratégique simple

**Statut** : Validée

---

### D-003 — Verrouillage à T-15 minutes

**Date** : 2026-05-04

**Contexte** : Assurer l’équité des pronos.

**Décision** :
- Lock 15 minutes avant `kickoff_at`

**Alternatives** :
- Lock à T-0
- Lock 1h avant

**Pourquoi** :
Compromis entre flexibilité et équité.

**Impact** :
- Backend : calcul `is_locked`
- Frontend : état UI
- QA : tests de deadline

**Statut** : Validée

---

### D-004 — Score entreprise = moyenne des membres

**Date** : 2026-05-04

**Contexte** : Définir le classement des entreprises.

**Décision** :
- Moyenne des points des membres

**Alternatives** :
- Somme totale
- Top N joueurs

**Pourquoi** :
Équilibre participation vs performance.

**Impact** :
- Backend : vue `company_scores`
- UX : classement équitable

**Statut** : Validée

---

## 🔄 Process de mise à jour

1. Une décision est prise par le PO
2. Elle est ajoutée ici
3. Le Master of Context met à jour les fichiers concernés
4. L’équipe s’aligne

---

## ⚠️ À éviter

```
- Décider sans tracer
- Modifier une règle sans log
- Multiplier les décisions non validées
```

---

## ✅ Definition of Done

Le decisions log est efficace si :

```
- Les décisions clés sont tracées
- L’équipe comprend les choix
- Les débats ne se répètent pas
- Les agents IA restent alignés
```

---

## 🧠 Rappel

```
Un bon log = moins de débats
Un mauvais log = retour en arrière constant
```

👉 Documenter 2 minutes = gagner 2 heures plus tard
