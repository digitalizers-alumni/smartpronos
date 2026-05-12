# 09 — API Contracts

## Objectif

Définir les contrats d’intégration entre le frontend, le backend
Supabase, la data football, la QA et les agents IA.

Ce fichier est aligné avec `CONTEXT/03.schema.sql`.

Principes :

```txt
- Backend source de vérité
- Scoring calculé côté backend uniquement
- Statut match calculé dynamiquement
- Boost unique garanti côté DB
- Dates retournées en ISO UTC
- Le frontend affiche, mais ne décide pas des règles critiques
```

---

# Formats standards

## Dates

Toutes les dates sont des timestamps UTC.

```txt
2026-06-11T19:00:00.000Z
```

## Mutations RPC

Les RPC de mutation retournent une enveloppe logique.

Succès :

```json
{
  "success": true,
  "data": {}
}
```

Erreur :

```json
{
  "success": false,
  "error_code": "ERROR_CODE",
  "message": "Message lisible."
}
```

## RPC de lecture

Les RPC de lecture de listes retournent des lignes tabulaires Supabase.

```txt
get_match_list()
get_global_leaderboard()
get_company_leaderboard(p_company_id)
get_companies_leaderboard()
```

---

# Auth & Profile

## Contrat frontend attendu

Le frontend utilise deux couches distinctes :

```txt
1. Supabase Auth pour créer la session
2. Backend DB (view + RPC) pour compléter et lire le profil applicatif
```

Pages cibles :

```txt
- pages/auth/signup
- pages/auth/login
- pages/auth/check-email
- pages/onboarding/profile-create
```

Règle de navigation :

```txt
- utilisateur non connecté -> pages/auth/login ou pages/auth/signup
- utilisateur inscrit sans session active -> pages/auth/check-email
- utilisateur connecté avec pseudo temporaire -> pages/onboarding/profile-create
- utilisateur connecté avec pseudo final -> application
```

Pseudo temporaire :

```txt
username commençant par "user_" et généré par handle_new_user()
```

---

## Auth provider — sign_up_with_email

### Objectif

Créer un compte utilisateur via Supabase Auth depuis `pages/auth/signup`.

### Appel frontend

```ts
supabase.auth.signUp({
  email,
  password
})
```

### Input

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

### Output succès

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": null
}
```

ou

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "jwt",
    "refresh_token": "jwt"
  }
}
```

### Lecture frontend

```txt
- session = null -> email confirmation requise -> rediriger vers pages/auth/check-email
- session != null -> utilisateur connecté immédiatement -> lire current_user_profile
- le trigger handle_new_user crée automatiquement profiles
```

### Erreurs frontend à gérer

```json
{
  "error_code": "EMAIL_ALREADY_USED",
  "message": "Un compte existe déjà avec cet email."
}
```

```json
{
  "error_code": "WEAK_PASSWORD",
  "message": "Le mot de passe ne respecte pas les règles minimales."
}
```

```json
{
  "error_code": "INVALID_EMAIL",
  "message": "L'adresse email est invalide."
}
```

---

## Auth provider — sign_in_with_email

### Objectif

Connecter un utilisateur existant depuis `pages/auth/login`.

### Appel frontend

```ts
supabase.auth.signInWithPassword({
  email,
  password
})
```

### Input

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

### Output succès

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "jwt",
    "refresh_token": "jwt"
  }
}
```

### Erreurs frontend à gérer

```json
{
  "error_code": "INVALID_CREDENTIALS",
  "message": "Email ou mot de passe incorrect."
}
```

```json
{
  "error_code": "EMAIL_NOT_CONFIRMED",
  "message": "L'adresse email doit être confirmée avant connexion."
}
```

---

## Auth provider — get_auth_state

### Objectif

Déterminer au chargement de l'application si une session existe déjà.

### Appel frontend

```ts
supabase.auth.getSession()
```

### Lecture frontend

```txt
- pas de session -> pages/auth/login
- session active -> lire current_user_profile
```

---

## Trigger — handle_new_user

### Objectif

Créer automatiquement un profil à chaque inscription Supabase Auth.

### Déclencheur

```txt
AFTER INSERT ON auth.users
```

### Effet

```json
{
  "id": "auth.users.id",
  "email": "user@example.com",
  "username": "user_abc12345",
  "avatar_url": null
}
```

### Règles backend

```txt
- profile créé côté DB, pas côté frontend
- email obligatoire et unique
- username temporaire généré par défaut
```

---

## RPC — create_or_update_profile

### Objectif

Mettre à jour le profil utilisateur après authentification.

### Input

```json
{
  "username": "Louis"
}
```

### Output success

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "Louis",
    "avatar_url": null,
    "created_at": "2026-06-01T10:00:00.000Z",
    "updated_at": "2026-06-01T10:03:00.000Z"
  }
}
```

### Erreurs possibles

```json
{
  "success": false,
  "error_code": "NOT_AUTHENTICATED",
  "message": "Utilisateur non connecté."
}
```

```json
{
  "success": false,
  "error_code": "USERNAME_REQUIRED",
  "message": "Le pseudo est obligatoire."
}
```

```json
{
  "success": false,
  "error_code": "USERNAME_INVALID",
  "message": "Le pseudo doit contenir entre 2 et 20 caractères."
}
```

```json
{
  "success": false,
  "error_code": "USERNAME_TAKEN",
  "message": "Ce pseudo est déjà utilisé."
}
```

### Règles backend

```txt
- Utilise auth.uid()
- L’utilisateur ne modifie que son profil
- username obligatoire, unique, longueur 2..20
- profile normalement déjà créé par trigger handle_new_user
```

---

## VIEW — current_user_profile

### Objectif

Retourner le profil courant enrichi avec la première entreprise rejointe
et les informations nécessaires au routage frontend post-auth.

### Output item

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "Louis",
  "avatar_url": null,
  "company_id": "uuid",
  "company_name": "Digitalizers"
}
```

`company_id` et `company_name` peuvent être `null`.

### État dérivé côté frontend

```txt
- needs_profile_completion = true si username commence par "user_"
- needs_profile_completion = false sinon
```

### Usage frontend

```txt
- needs_profile_completion = true -> pages/onboarding/profile-create
- needs_profile_completion = false -> application
```

---

# Companies & Invitations

## RPC — create_company

### Objectif

Créer une entreprise et ajouter automatiquement le créateur comme membre.

### Input

```json
{
  "name": "Digitalizers"
}
```

### Output success

```json
{
  "success": true,
  "data": {
    "company_id": "uuid",
    "name": "Digitalizers",
    "invite_code": "ABCDEFGH",
    "invite_url_path": "/join/ABCDEFGH"
  }
}
```

### Erreurs possibles

```json
{
  "success": false,
  "error_code": "NOT_AUTHENTICATED",
  "message": "Utilisateur non connecté."
}
```

```json
{
  "success": false,
  "error_code": "COMPANY_NAME_REQUIRED",
  "message": "Le nom de l’entreprise est obligatoire."
}
```

```json
{
  "success": false,
  "error_code": "COMPANY_NAME_TAKEN",
  "message": "Cette entreprise existe déjà."
}
```

### Règles backend

```txt
- invite_code généré côté DB via generate_invite_code()
- format invite_code : 8 caractères majuscules, sans caractères ambigus
- companies.name unique
- companies.created_by = auth.uid()
- ajout automatique dans company_members
- pas de champ role dans company_members
```

---

## RPC — join_company_by_invite_code

### Objectif

Permettre à un utilisateur de rejoindre une entreprise avec un code
d’invitation.

### Input

```json
{
  "invite_code": "ABCDEFGH"
}
```

### Output success

```json
{
  "success": true,
  "data": {
    "company_id": "uuid",
    "company_name": "Digitalizers",
    "membership_status": "joined"
  }
}
```

### Output si déjà membre

```json
{
  "success": true,
  "data": {
    "company_id": "uuid",
    "company_name": "Digitalizers",
    "membership_status": "already_member"
  }
}
```

### Erreurs possibles

```json
{
  "success": false,
  "error_code": "NOT_AUTHENTICATED",
  "message": "Utilisateur non connecté."
}
```

```json
{
  "success": false,
  "error_code": "INVALID_INVITE_CODE",
  "message": "Ce lien d’invitation est invalide."
}
```

### Règles backend

```txt
- lookup sur companies.invite_code
- insert dans company_members avec user_id = auth.uid()
- aucun doublon grâce à unique(user_id, company_id)
- joined_at renseigné automatiquement
```

---

## VIEW — company_members_with_scores

### Objectif

Retourner les membres d’une entreprise avec leur score calculé.

### Filtre frontend

```txt
company_id = uuid
```

### Output item

```json
{
  "company_id": "uuid",
  "user_id": "uuid",
  "username": "Louis",
  "avatar_url": null,
  "total_points": 12,
  "exact_count": 2,
  "joined_at": "2026-06-01T10:00:00.000Z"
}
```

### Règles backend

```txt
- total_points vaut 0 si aucun point
- exact_count vaut 0 si aucun score exact
- joined_at vient de company_members.joined_at
```

---

## VIEW — company_invite_info

### Objectif

Retourner les informations minimales d’une entreprise depuis son code
d’invitation.

### Filtre frontend

```txt
invite_code = ABCDEFGH
```

### Output item

```json
{
  "company_id": "uuid",
  "company_name": "Digitalizers",
  "invite_code": "ABCDEFGH",
  "member_count": 12
}
```

### Règles backend

```txt
- Ne retourne aucune donnée sensible
- Lecture réservée aux utilisateurs authentifiés dans la V2
```

---

# Matches

## VIEW — matches_with_status

### Objectif

Calculer dynamiquement le statut d’un match.

### Output item

```json
{
  "id": "uuid",
  "home_team_id": "uuid",
  "away_team_id": "uuid",
  "kickoff_at": "2026-06-11T19:00:00.000Z",
  "stage": "group",
  "created_at": "2026-06-01T10:00:00.000Z",
  "status": "scheduled"
}
```

### Règles backend

```txt
- Pas de colonne matches.status
- finished si match_results existe
- locked si now() >= kickoff_at - 15 minutes
- scheduled sinon
```

---

## RPC — get_match_list

### Objectif

Retourner les matchs avec équipes, statut dynamique, prono utilisateur et
résultat éventuel.

### Input

```json
{}
```

### Output item

```json
{
  "match_id": "uuid",
  "home_team_name": "France",
  "home_team_code": "FRA",
  "home_team_flag": null,
  "away_team_name": "Brazil",
  "away_team_code": "BRA",
  "away_team_flag": null,
  "kickoff_at": "2026-06-11T19:00:00.000Z",
  "stage": "group",
  "status": "scheduled",
  "user_home_score": 2,
  "user_away_score": 1,
  "user_is_boosted": true,
  "result_home_score": null,
  "result_away_score": null
}
```

### Règles backend

```txt
- Utilise auth.uid()
- Trie par kickoff_at ASC
- Ne retourne que le prono de l’utilisateur courant
- Le statut vient de matches_with_status
```

---

# Predictions

## RPC — upsert_prediction

### Objectif

Créer ou modifier un pronostic avant deadline.

### Input

```json
{
  "match_id": "uuid",
  "home_score": 2,
  "away_score": 1,
  "is_boosted": false
}
```

### Output success

```json
{
  "success": true,
  "data": {
    "prediction_id": "uuid",
    "match_id": "uuid",
    "home_score": 2,
    "away_score": 1,
    "is_boosted": false,
    "updated_at": "2026-06-10T12:00:00.000Z"
  }
}
```

### Erreurs possibles

```txt
NOT_AUTHENTICATED
MATCH_NOT_FOUND
MATCH_LOCKED
INVALID_SCORE
BOOST_ALREADY_USED
```

### Règles backend

```txt
- home_score et away_score entre 0 et 99
- lock serveur : now() < kickoff_at - 15 minutes
- upsert sur unique(user_id, match_id)
- 1 boost par user garanti par l’index unique partiel one_boost_per_user
```

---

# Results & Scoring

## RPC — set_match_result

### Objectif

Insérer le résultat officiel d’un match.

### Input

```json
{
  "match_id": "uuid",
  "home_score": 2,
  "away_score": 1
}
```

### Output success

```json
{
  "success": true,
  "data": {
    "match_id": "uuid",
    "result_id": "uuid",
    "home_score": 2,
    "away_score": 1
  }
}
```

### Règles backend

```txt
- Écriture admin/service_role uniquement
- Un seul résultat par match
- Aucun update de matches.status
- matches_with_status devient finished grâce à l’existence du résultat
```

---

## VIEW — user_scores

### Objectif

Calculer les points par utilisateur.

### Output item

```json
{
  "user_id": "uuid",
  "exact_count": 2,
  "total_points": 12
}
```

### Règles backend

```txt
- Score exact = 5 points
- Bon résultat = 2 points
- Mauvais résultat = 0 point
- Boost = points x2
- Les points ne sont jamais stockés
```

---

## VIEW — company_scores

### Objectif

Calculer le score entreprise selon la V2.

### Output item

```json
{
  "company_id": "uuid",
  "member_count": 12,
  "active_member_count": 8,
  "avg_points": 18.4,
  "total_points": 147
}
```

### Règles backend

```txt
- member_count = tous les membres
- active_member_count = membres avec score
- avg_points exclut les membres sans prono
```

---

# Leaderboards

## RPC — get_global_leaderboard

### Output item

```json
{
  "rank": 1,
  "user_id": "uuid",
  "username": "Louis",
  "total_points": 32,
  "exact_count": 4
}
```

### Règles backend

```txt
- Tri total_points DESC
- Puis exact_count DESC
- Puis user_id ASC
```

---

## RPC — get_company_leaderboard

### Input

```json
{
  "p_company_id": "uuid"
}
```

### Output item

```json
{
  "rank": 1,
  "user_id": "uuid",
  "username": "Louis",
  "total_points": 32,
  "exact_count": 4
}
```

---

## RPC — get_companies_leaderboard

### Output item

```json
{
  "rank": 1,
  "company_id": "uuid",
  "name": "Digitalizers",
  "member_count": 12,
  "active_member_count": 8,
  "avg_points": 18.4,
  "total_points": 147
}
```

---

# QA Contracts

## Auth / Profile

```txt
- Un profil est auto-créé à l’inscription
- username vide refusé
- username < 2 ou > 20 refusé
- username déjà pris refusé
- User A ne peut modifier que son profil
```

## Company

```txt
- Création entreprise OK
- Nom entreprise unique
- invite_code généré côté DB, 8 caractères
- Créateur ajouté comme membre
- Join via invite_code OK
- Join via mauvais code refusé
- Join en doublon ne duplique pas
```

## Matches

```txt
- Aucun champ matches.status stocké
- matches_with_status retourne scheduled avant T-15
- matches_with_status retourne locked après T-15
- matches_with_status retourne finished si match_result existe
```

## Predictions / Boost

```txt
- Score négatif refusé
- Score > 99 refusé
- Deux pronos sur le même match impossibles
- Deuxième boost rejeté par one_boost_per_user
- Prono après T-15 refusé
```

## Scoring / Leaderboards

```txt
- Score exact = 5 points
- Bon résultat = 2 points
- Mauvais résultat = 0 point
- Boost double les points
- Membres sans prono exclus de avg_points
```

---

# Hors Scope MVP

```txt
- Notifications push
- Chat temps réel
- Système de paiement
- IA prédictive
- API football temps réel complexe
- Dashboard admin complet
- Multi-ligues avancé
- Multi-langue avancé
```
