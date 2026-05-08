# 01 — Product Scope

## 🎯 Objectif du scope

Définir **ce que nous construisons (et ce que nous ne construisons pas)** pour livrer une application jouable en 3 semaines.

👉 Principe :
- Moins de features
- Plus de qualité
- 100% jouable

---

## 🧱 MVP — P0 (Indispensable)

Sans ces fonctionnalités, le produit ne fonctionne pas.

### 🔐 Auth & Profil

```
- Connexion via magic link
- Création automatique du profil
- Pseudo utilisateur
- Association à une entreprise (join/create)
```

---

### 🏢 Entreprises & Ligues

```
- Rejoindre une entreprise via lien
- Créer une entreprise
- Voir les membres de son entreprise (simple liste)
```

---

### ⚽ Matchs

```
- Liste des matchs (date, équipes, statut)
- Détail d’un match (optionnel minimal)
- Statut : à venir / verrouillé / terminé
```

---

### 🎯 Pronostics

```
- Saisir un score (ex: 2-1)
- Modifier avant deadline
- Verrouillage automatique avant match
- Un seul prono par match
- Voir ses pronos
```

---

### 🧮 Scoring

```
- Score exact → 5 pts
- Bon résultat → 2 pts
- Mauvais résultat → 0 pt
- Multiplicateur (boost) → x2 sur un match
```

👉 Calcul côté backend uniquement

---

### 🏆 Leaderboards

```
- Classement individuel global
- Classement individuel dans l’entreprise
- Classement des entreprises (moyenne ou total)
```

---

### 📩 Invitation / Referral

```
- Générer un lien d’invitation
- Rejoindre via lien
- CTA pour inviter collègues
```

---

## ⚡ P1 — Important (si temps)

Améliore fortement l’engagement mais non bloquant.

### 🎮 Gamification

```
- Badges simples (streak, top player…)
- Position dans le classement mise en avant
- Messages fun (microcopy)
```

### 🏢 Entreprises avancé

```
- Score entreprise basé sur moyenne des membres
- Mise en avant des rivalités (ex: Patek vs Rolex)
```

### 📊 Contexte match

```
- Texte simple : historique, forme, info clé
```

---

## ✨ P2 — Bonus (si miracle)

À faire uniquement si tout le reste est parfait.

```
- Historique détaillé des pronos
- Statistiques utilisateur
- UI plus poussée
- Animations légères
```

---

## 🚫 Hors Scope

Ne doit PAS être développé.

```
- IA de prédiction automatique
- Paris avec argent
- API football complexe temps réel
- Chat en temps réel
- Notifications push natives
- App native iOS / Android
- Dashboard admin complet
- Scoring complexe
- Multi-langue avancé
```

👉 Toute tentative d’ajout doit être validée par le Product Owner

---

## ⚖️ Règles de priorisation

Pour chaque feature, vérifier :

```
- Est-ce que ça permet de jouer ?
- Est-ce que ça rend le jeu plus fun ?
- Est-ce que ça renforce la compétition sociale ?
- Est-ce que c’est faisable en < 1 jour ?
```

👉 Si NON → repoussé ou supprimé

---

## 🧨 Kill list (à surveiller)

Les pièges classiques :

```
- “On ajoute juste un petit truc”
- “C’est rapide à faire”
- “On peut améliorer après”
- “L’IA pourrait faire…”
```

👉 Ces phrases = dérive de scope

---

## 📦 Definition of Done (Produit)

Le produit est considéré prêt si :

```
- Un utilisateur peut se connecter
- Rejoindre une entreprise
- Faire des pronostics
- Être bloqué après deadline
- Recevoir des points
- Voir les leaderboards
- Inviter quelqu’un
- Utiliser l’app sur mobile sans aide
```

👉 Si ça marche → MVP réussi
👉 Le reste = bonus

---

## 🧠 Rappel stratégique

```
Moins de features
Plus de stabilité
Plus de fun
Plus de social
```

👉 Le but n’est pas d’impressionner des devs
👉 Le but est que des gens jouent vraiment

