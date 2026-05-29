# 05 — Business Rules (Règles du jeu)

## 🎯 Objectif

Définir de manière **claire, unique et non ambiguë** toutes les règles du jeu : scoring, verrouillage, boost et classements.

👉 Source de vérité pour Backend, Frontend et QA.
👉 Si une règle n’est pas ici, elle n’existe pas.

---

## ⚽ Terminologie

```
Prono = prédiction du score final (home_score, away_score)
Résultat = score officiel d’un match
Boost = multiplicateur x2 appliqué à un prono
Deadline = moment de verrouillage avant le match
Statut match = scheduled | locked | finished
```

---

## ⏱️ Verrouillage des pronostics

### Règle

```
Un prono est verrouillé 15 minutes avant le coup d’envoi (kickoff_at).
```

### Conséquences

- ❌ Impossible de créer un prono après la deadline
- ❌ Impossible de modifier un prono après la deadline
- ❌ Impossible de supprimer un prono après la deadline

### Implémentation

```
is_locked = now() >= (kickoff_at - 15 minutes)
```

### UX

- Afficher le statut : Ouvert / Verrouillé / Terminé
- Message explicite si tentative après deadline

---

## 🎯 Règles de pronostics

### Unicité

```
Un utilisateur ne peut avoir qu’un seul prono par match.
```

### Format

```
home_score: integer >= 0
away_score: integer >= 0
```

### Modification

```
Autorisé uniquement avant verrouillage
```

---

## 🧮 Système de scoring (MVP)

### Cas 1 — Score exact

```
Condition :
prono.home_score == result.home_score
AND prono.away_score == result.away_score

Points : 5
```

### Cas 2 — Bon résultat (1N2)

```
Condition :
- Victoire domicile correctement prédite
- Victoire extérieur correctement prédite
- Match nul correctement prédit

Points : 2
```

### Cas 3 — Mauvais prono

```
Condition :
Aucune des conditions ci-dessus

Points : 0
```

### Détermination du résultat

```
home_win  : home_score > away_score
away_win  : home_score < away_score
draw      : home_score == away_score
```

---

## ⚡ Boost (multiplicateur)

### Règle MVP

```
Chaque utilisateur peut activer 1 boost sur l’ensemble du tournoi.
```

### Effet

```
Points du match x2
```

### Contraintes

- ❌ Impossible d’ajouter un boost après verrouillage
- ❌ Impossible de déplacer un boost après verrouillage
- ❌ Un seul match boosté par utilisateur

### Implémentation

```
predictions.is_boosted = true | false

contrainte :
count(is_boosted=true par user) <= 1
```

---

## 🏆 Leaderboards

### 1. Classement individuel global

```
Tri : total_points DESC

En cas d’égalité :
- Plus grand nombre de scores exacts
- Sinon ordre arbitraire (id)
```

### 2. Classement individuel entreprise

```
Filtrer par company_id
Tri identique au global
```

### 3. Classement entreprises

#### Méthode MVP (recommandée)

```
Score entreprise = moyenne des points des membres
```

#### Alternatives (hors MVP)

```
- Somme totale
- Top N joueurs uniquement
```

---

## 🔄 Mise à jour des scores

### Déclencheur

```
Insertion d’un match_result
```

### Effets

- Recalcul des points utilisateurs
- Mise à jour des vues leaderboards

### Contrainte

```
Les résultats officiels sont immuables après validation
(sauf correction admin exceptionnelle)
```

---

## 🚦 Statuts des matchs

```
scheduled : prono ouvert
locked    : prono fermé
finished  : résultat disponible
```

### Transition

```
scheduled → locked → finished
```

---

## ⚠️ Cas limites

### Égalités de points

```
Gérées via tie-break (scores exacts)
```

### Prono à la limite de deadline

```
Décision basée sur l’heure serveur (UTC)
```

### Données manquantes

```
Pas de scoring tant que match_result absent
```

### Scores aberrants

```
Autorisés (0 à N), pas de limite stricte MVP
```

---

## 🔐 Sécurité & intégrité

- Calcul des points uniquement côté backend
- Aucune logique de scoring côté frontend
- RLS empêche modification des données d’autrui
- Seuls les admins peuvent insérer/modifier les résultats

---

## 🧪 Règles testables (QA)

Checklist rapide :

```
- Score exact donne 5 points
- Bon résultat donne 2 points
- Mauvais résultat donne 0 point
- Boost double les points
- Verrouillage empêche modification
- 1 seul prono par match
- 1 seul boost par user
- Leaderboards cohérents après résultat
```

---

## 🚫 Hors scope (règles avancées)

```
- Points pour buteurs
- Points pour score à la mi-temps
- Multiplicateurs complexes
- Bonus surprise avancés
```

---

## ✅ Definition of Done

Les règles sont validées si :

```
- Les développeurs implémentent sans ambiguïté
- QA peut tester tous les cas
- Les utilisateurs comprennent facilement
- Les leaderboards sont justes
```

---

## 🧠 Rappel

```
Des règles simples = moins de bugs
Des règles claires = moins de débats
Des règles stables = meilleur produit
```

👉 Si vous hési