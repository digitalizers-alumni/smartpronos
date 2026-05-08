# 04 — Design System

## 🎯 Objectif

Créer une interface **cohérente, simple et fun**, utilisable par des utilisateurs casual sur mobile.

👉 Le design system permet :
- d’aller vite
- d’éviter les incohérences
- de faciliter le travail frontend
- de rendre le produit compréhensible instantanément

---

## 🧠 Principes UX

```
- Mobile first
- Simple avant tout
- Visible > subtil
- Rapide > parfait
- Fun mais lisible
```

👉 Si un utilisateur doit réfléchir → c’est un problème UX

---

## 🎨 Identité visuelle

### Ton

```
- Fun
- Compétitif
- Social
- Léger (pas corporate rigide)
```

### Couleurs (exemple MVP)

```
Primary      : #1E3A8A (bleu profond)
Secondary    : #F59E0B (orange)
Success      : #10B981 (vert)
Error        : #EF4444 (rouge)
Background   : #0F172A (dark)
Card         : #1E293B
Text Primary : #F8FAFC
Text Muted   : #94A3B8
```

👉 Contraste fort pour mobile

---

## 🔤 Typographie

```
Titre : bold, large
Texte : simple, lisible
CTA   : court et impactant
```

👉 Pas de paragraphes longs
👉 Pas de jargon

---

## 🧱 Composants principaux

### MatchCard

Affiche :
```
- équipes
- heure
- statut
- prono (si existant)
```

---

### PredictionForm

Permet :
```
- saisir score (input simple)
- activer boost
- valider prono
```

👉 Doit être ultra rapide

---

### LeaderboardTable

Affiche :
```
- rang
- pseudo
- points
```

👉 Mettre en avant :
- position utilisateur

---

### CompanyBadge

Affiche :
```
- nom entreprise
- couleur ou icône
```

---

### UserRankCard

Affiche :
```
- position
- points
- statut (top / milieu / dernier)
```

---

### MatchStatusBadge

```
- Ouvert (vert)
- Verrouillé (orange)
- Terminé (gris)
```

---

### BoostSelector

Permet :
```
- activer boost
- visualiser boost actif
```

---

### EmptyState

Exemple :
```
"Aucun prono pour l’instant. C’est ton moment."
```

---

### ErrorState

Exemple :
```
"Oups. Quelque chose s’est mal passé."
```

---

### LoadingState

```
- skeleton
- spinner simple
```

---

## 🧭 Navigation

### Structure simple

```
- Home (matchs)
- Mes pronos
- Leaderboard
- Profil
```

👉 Pas de navigation complexe

---

## 📱 Mobile UX rules

```
- Boutons larges
- Zones cliquables > 44px
- Scroll vertical simple
- Pas de hover
- Feedback immédiat
```

👉 Test systématique sur téléphone

---

## 💬 Microcopy (très important)

Ton = fun, léger, jamais agressif

### Exemples

```
- "Ton prono est verrouillé. Bonne chance 😏"
- "Tu es 3ème. Ça commence à devenir sérieux."
- "Ton entreprise compte sur toi."
- "Invite tes collègues. Tu ne peux pas gagner seul."
```

👉 Le texte fait partie du produit

---

## ⚡ États UI à gérer

```
- Chargement
- Erreur
- Vide
- Succès
- Verrouillé
- Terminé
```

👉 Aucun écran ne doit être vide sans explication

---

## 🚀 Performance

```
- Pages rapides
- Peu d’images
- Pas d’animations lourdes
- Chargement progressif
```

Objectif :
```
- Prono en < 30 secondes
```

---

## 🚫 À éviter

```
- UI complexe
- animations inutiles
- trop de couleurs
- trop d’info sur un écran
- composants non réutilisables
```

---

## ✅ Definition of Done

Le design system est validé si :

```
- L’app est compréhensible sans explication
- Les écrans sont cohérents
- Le prono est rapide à faire
- Le leaderboard est lisible
- L’expérience mobile est fluide
```

---

## 🧠 Rappel

```
Un bon design = on ne réfléchit pas
Un mauvais design = on cherche quoi faire
```

👉 Si tu dois expliquer l’interface, elle est déjà ratée

