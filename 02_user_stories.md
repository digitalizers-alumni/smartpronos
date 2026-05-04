# 02 — User Stories

## 🎯 Objectif du fichier

Décrire les parcours utilisateurs principaux de l’application Pronostic 2026.

Ces user stories servent à aligner :

- Product Owner
- Frontend
- Backend
- QA
- Data Football
- Agents IA

👉 Une feature n’est pas validée parce qu’elle est “stylée”.  
Elle est validée si elle sert un vrai parcours utilisateur.

---

## 👤 Personas principaux

### 1. Utilisateur casual

Personne qui aime l’ambiance Coupe du Monde, sans être expert football.

#### Besoins

```
- Comprendre vite le jeu
- Faire un prono facilement
- Voir son classement
- Jouer avec ses collègues ou amis
```

---

### 2. Employé d’entreprise

Personne qui rejoint la compétition via son entreprise.

#### Besoins

```
- Rejoindre son entreprise rapidement
- Comparer son score avec ses collègues
- Faire gagner son entreprise
- Inviter d’autres collègues
```

---

### 3. Ambassadeur / créateur d’entreprise

Personne qui crée une équipe entreprise et invite les autres.

#### Besoins

```
- Créer une entreprise
- Partager un lien d’invitation
- Voir qui a rejoint
- Motiver son équipe à participer
```

---

## 🔐 Authentification & onboarding

### US-001 — Se connecter simplement

En tant qu’utilisateur,  
je veux me connecter avec mon email,  
afin d’accéder rapidement à l’application sans créer un mot de passe.

#### Critères d’acceptation

```
- L’utilisateur peut entrer son email
- Il reçoit un magic link
- Il accède à l’app après validation
- Un profil est créé si nécessaire
```

---

### US-002 — Créer mon profil

En tant qu’utilisateur,  
je veux choisir un pseudo,  
afin d’être identifiable dans les classements.

#### Critères d’acceptation

```
- L’utilisateur peut choisir un pseudo
- Le pseudo est affiché dans les leaderboards
- Le pseudo peut être modifié si besoin
```

---

## 🏢 Entreprises

### US-003 — Rejoindre une entreprise via lien

En tant qu’employé,  
je veux rejoindre mon entreprise via un lien d’invitation,  
afin de participer à la compétition avec mes collègues.

#### Critères d’acceptation

```
- Le lien ouvre l’app
- L’entreprise est reconnue automatiquement
- L’utilisateur peut confirmer son appartenance
- L’utilisateur est ajouté à l’entreprise
```

---

### US-004 — Créer une entreprise

En tant qu’ambassadeur,  
je veux créer une entreprise,  
afin d’inviter mes collègues à participer.

#### Critères d’acceptation

```
- L’utilisateur peut entrer le nom de l’entreprise
- Une entreprise est créée
- Un lien d’invitation est généré
- Le créateur devient membre de l’entreprise
```

---

### US-005 — Voir les membres de mon entreprise

En tant qu’utilisateur,  
je veux voir les membres de mon entreprise,  
afin de savoir qui participe.

#### Critères d’acceptation

```
- Une liste simple des membres est affichée
- Le pseudo de chaque membre est visible
- Le score de chaque membre peut être affiché si disponible
```

---

## ⚽ Matchs

### US-006 — Voir la liste des matchs

En tant qu’utilisateur,  
je veux voir les matchs à venir,  
afin de faire mes pronostics.

#### Critères d’acceptation

```
- Les matchs sont affichés par date
- Les équipes sont visibles
- L’heure du match est visible
- Le statut du match est clair : ouvert / verrouillé / terminé
```

---

### US-007 — Voir le détail d’un match

En tant qu’utilisateur,  
je veux voir les informations principales d’un match,  
afin de mieux réfléchir à mon prono.

#### Critères d’acceptation

```
- Les deux équipes sont visibles
- La date et l’heure sont visibles
- Le statut du match est visible
- Un contexte simple peut être affiché si disponible
```

---

## 🎯 Pronostics

### US-008 — Faire un prono

En tant qu’utilisateur,  
je veux prédire le score final d’un match,  
afin de gagner des points.

#### Critères d’acceptation

```
- L’utilisateur peut saisir un score pour chaque équipe
- Le prono est enregistré
- L’utilisateur voit une confirmation
- Un seul prono existe par utilisateur et par match
```

---

### US-009 — Modifier mon prono avant deadline

En tant qu’utilisateur,  
je veux modifier mon prono avant le verrouillage,  
afin d’ajuster mon choix.

#### Critères d’acceptation

```
- Le prono peut être modifié avant deadline
- Le nouveau score remplace l’ancien
- L’utilisateur voit une confirmation
```

---

### US-010 — Être bloqué après verrouillage

En tant qu’utilisateur,  
je ne veux pas que les pronos soient modifiables après deadline,  
afin que la compétition soit équitable.

#### Critères d’acceptation

```
- Le formulaire est désactivé après deadline
- Un message explique que le prono est verrouillé
- Aucune modification backend n’est possible après deadline
```

---

### US-011 — Utiliser un boost

En tant qu’utilisateur,  
je veux pouvoir booster un prono,  
afin de doubler mes points sur un match stratégique.

#### Critères d’acceptation

```
- L’utilisateur peut choisir un match boosté
- Le boost est visible sur le prono
- Le boost ne peut pas être ajouté après deadline
- Le boost est pris en compte dans le scoring
```

---

## 🧮 Scoring

### US-012 — Gagner des points après résultat

En tant qu’utilisateur,  
je veux recevoir des points selon la précision de mon prono,  
afin de progresser dans le classement.

#### Critères d’acceptation

```
- Score exact = points maximum
- Bon résultat = points partiels
- Mauvais résultat = 0 point
- Boost = multiplicateur appliqué
- Les points sont calculés côté backend
```

---

## 🏆 Leaderboards

### US-013 — Voir le leaderboard global

En tant qu’utilisateur,  
je veux voir le classement global,  
afin de me comparer à tous les joueurs.

#### Critères d’acceptation

```
- Les utilisateurs sont classés par points
- Mon rang est visible
- Les égalités sont gérées proprement
```

---

### US-014 — Voir le leaderboard de mon entreprise

En tant qu’utilisateur,  
je veux voir le classement de mon entreprise,  
afin de me comparer à mes collègues.

#### Critères d’acceptation

```
- Les membres de mon entreprise sont classés
- Mon rang est visible
- Les scores sont cohérents avec les pronos
```

---

### US-015 — Voir le classement des entreprises

En tant qu’utilisateur,  
je veux voir le classement des entreprises,  
afin de suivre la compétition collective.

#### Critères d’acceptation

```
- Les entreprises sont classées
- Le score collectif est visible
- Le nombre de participants peut être visible
```

---

## 📩 Invitation & referral

### US-016 — Inviter des collègues

En tant qu’utilisateur,  
je veux partager un lien d’invitation,  
afin de faire rejoindre plus de monde à mon entreprise.

#### Critères d’acceptation

```
- Un lien d’invitation est disponible
- Le lien peut être copié facilement
- Le lien permet de rejoindre directement l’entreprise
```

---

### US-017 — Rejoindre depuis une invitation

En tant que nouvel utilisateur,  
je veux rejoindre la bonne entreprise depuis un lien partagé,  
afin de commencer sans configuration compliquée.

#### Critères d’acceptation

```
- Le lien conserve l’entreprise cible
- L’utilisateur peut se connecter ou créer son profil
- Après onboarding, il rejoint automatiquement l’entreprise
```

---

## 🎮 Gamification

### US-018 — Voir des messages fun

En tant qu’utilisateur,  
je veux recevoir des messages légers et amusants,  
afin que l’expérience soit plus engageante.

#### Critères d’acceptation

```
- Une confirmation fun apparaît après un prono
- Le ton reste friendly
- Les messages ne bloquent jamais l’action principale
```

---

### US-019 — Obtenir des badges simples

En tant qu’utilisateur,  
je veux obtenir des badges simples,  
afin d’avoir une reconnaissance visible.

#### Critères d’acceptation

```
- Les badges sont compréhensibles
- Ils sont liés à une action simple
- Ils ne complexifient pas le scoring principal
```

---

## 📱 Mobile-first

### US-020 — Utiliser l’app sur mobile

En tant qu’utilisateur,  
je veux utiliser l’app facilement depuis mon téléphone,  
afin de jouer rapidement depuis un lien partagé.

#### Critères d’acceptation

```
- Les boutons sont faciles à toucher
- Les textes sont lisibles
- Le prono se fait rapidement
- Le leaderboard est lisible sur petit écran
```

---

## ✅ Parcours utilisateur critique MVP

Le parcours minimum à valider est :

```
1. Je reçois un lien
2. J’ouvre l’app
3. Je me connecte
4. Je crée mon profil
5. Je rejoins mon entreprise
6. Je vois les matchs
7. Je fais un prono
8. Mon prono est verrouillé avant match
9. Le résultat est saisi
10. Je reçois des points
11. Je vois mon classement
12. J’invite quelqu’un
```

👉 Si ce parcours fonctionne, le MVP est vivant.

---

## 🚫 User stories hors scope MVP

```
- Recevoir des notifications push natives
- Chatter avec les autres utilisateurs
- Obtenir une prédiction IA automatique
- Miser de l’argent
- Personnaliser fortement son profil
- Suivre des statistiques avancées joueur par joueur
```

👉 Ces idées peuvent exister plus tard, mais pas dans le MVP 3 semaines.

