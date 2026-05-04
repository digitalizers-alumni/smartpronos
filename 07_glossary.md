# 07 — Glossary (Glossaire)

## 🎯 Objectif

Définir clairement tous les termes utilisés dans le projet afin d’éviter toute ambiguïté entre :

- Product Owner
- Backend
- Frontend
- QA
- Data
- Agents IA

👉 Si un terme est ambigu, il doit être défini ici.

---

## 📚 Termes produit

### Utilisateur (User)

Personne utilisant l’application.

```
- Identifié par un profil (profiles)
- Peut faire des pronos
- Peut rejoindre une entreprise
```

---

### Profil (Profile)

Données associées à un utilisateur.

```
- id
- email
- username (pseudo)
- avatar (optionnel)
```

---

### Entreprise (Company)

Groupe d’utilisateurs.

```
- Permet de créer une compétition collective
- Contient plusieurs membres
- Possède un code d’invitation
```

---

### Membre d’entreprise (Company Member)

Relation entre un utilisateur et une entreprise.

```
- Un utilisateur peut appartenir à une entreprise
- Un utilisateur = un membre
```

---

### Match

Rencontre entre deux équipes.

```
- home_team
- away_team
- kickoff_at
- status
```

---

### Équipe (Team)

Sélection nationale participant à la Coupe du Monde.

```
- nom
- code (FRA, BRA…)
- drapeau (optionnel)
```

---

## 🎯 Termes liés au jeu

### Prono (Prediction)

Prédiction du score final d’un match.

```
- home_score
- away_score
- lié à un utilisateur
- lié à un match
```

---

### Résultat (Match Result)

Score officiel d’un match.

```
- home_score
- away_score
- déclenche le scoring
```

---

### Scoring

Calcul des points d’un utilisateur en fonction de ses pronos.

```
Score exact → 5 pts
Bon résultat → 2 pts
Mauvais → 0 pt
```

---

### Boost

Multiplicateur appliqué à un prono.

```
- Multiplie les points x2
- Limité à 1 par utilisateur (MVP)
```

---

### Deadline

Moment à partir duquel un prono ne peut plus être modifié.

```
- 15 minutes avant kickoff
```

---

### Verrouillage (Lock)

État d’un match après la deadline.

```
- Aucun prono ne peut être modifié
```

---

### Statut du match

```
scheduled → prono ouvert
locked → prono fermé
finished → résultat disponible
```

---

## 🏆 Termes de classement

### Leaderboard global

Classement de tous les utilisateurs.

---

### Leaderboard entreprise

Classement des utilisateurs d’une même entreprise.

---

### Classement des entreprises

Classement des entreprises entre elles.

```
- Basé sur la moyenne des points des membres (MVP)
```

---

### Rang (Rank)

Position d’un utilisateur ou d’une entreprise dans un leaderboard.

---

### Points (Points)

Score accumulé par un utilisateur.

---

## 📩 Termes sociaux

### Invitation (Referral)

Lien permettant à un utilisateur de rejoindre l’application.

```
- Peut inclure une entreprise cible
```

---

### Ambassadeur

Utilisateur qui crée une entreprise et invite d’autres personnes.

---

## ⚙️ Termes techniques

### Supabase

Backend utilisé pour :

```
- Auth
- Base de données
- API
```

---

### PWA (Progressive Web App)

Application web utilisable comme une app mobile.

---

### RLS (Row Level Security)

Règles de sécurité pour limiter l’accès aux données.

---

### View (SQL)

Table virtuelle utilisée pour calculer les scores.

---

### RPC

Fonction backend appelée depuis le frontend.

---

## 🚫 Termes interdits / confus

À éviter ou clarifier :

```
- “pari” → interdit (connotation argent)
- “IA prédictive” → hors scope
- “temps réel” → éviter (trop complexe)
```

---

## ✅ Definition of Done

Le glossaire est validé si :

```
- Tous les termes clés sont définis
- Aucun terme n’est ambigu
- Toute l’équipe parle le même langage
```

---

## 🧠 Rappel

```
Un mot mal défini = une feature mal implémentée
```

👉