# 09 — API Contracts

## 🎯 Objectif du fichier

Définir les contrats d’intégration entre :

- Frontend
- Backend Supabase
- Data Football
- QA
- Agents IA

Ce fichier décrit précisément :

```txt
- Les RPC Supabase à créer
- Les vues à exposer
- Les inputs attendus
- Les outputs retournés
- Les erreurs standardisées
- Les règles métier appliquées côté backend
```

👉 Le frontend ne doit pas deviner la structure des données.  
👉 Le backend ne doit pas inventer des formats au fil de l’eau.  
👉 La QA doit pouvoir tester chaque contrat simplement.

---

# 🧠 Principes API

## 1. Backend source de vérité

```txt
- Le scoring est calculé côté backend uniquement
- Le verrouillage est calculé côté backend uniquement
- Le boost unique est contrôlé côté backend uniquement
- Le frontend affiche, mais ne décide pas des règles critiques
```

---

## 2. Format des dates

Toutes les dates sont retournées en ISO UTC.

```txt
2026-06-11T19:00:00.000Z
```

Le frontend peut ensuite convertir selon la timezone utilisateur.

---

## 3. Format des erreurs

Toutes les erreurs RPC doivent suivre ce format logique :

```json
{
  "success": false,
  "error_code": "MATCH_LOCKED",
  "message": "Les pronostics sont verrouillés pour ce match."
}
```

---

## 4. Format des succès

Toutes les réponses RPC doivent suivre ce format logique :

```json
{
  "success": true,
  "data": {}
}
```

---

## 5. Statuts standards

### Match status

```txt
scheduled
locked
finished
```

### Prediction status côté UI

```txt
not_predicted
predicted
locked
finished
```

---

# 🔐 Auth & Profile

## RPC — create_or_update_profile

### Objectif

Créer ou mettre à jour le profil utilisateur après authentification Supabase.

### Utilisé par

```txt
Frontend onboarding
```

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
    "created_at": "2026-06-01T10:00:00.000Z"
  }
}
```

### Erreurs possibles

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
  "error_code": "NOT_AUTHENTICATED",
  "message": "Utilisateur non connecté."
}
```

### Règles backend

```txt
- Utilise auth.uid()
- L’utilisateur ne peut modifier que son propre profil
- username est obligatoire
```

---

## VIEW — current_user_profile

### Objectif

Retourner le profil de l’utilisateur connecté.

### Output

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

### Notes

```txt
company_id et company_name peuvent être null si l’utilisateur n’a pas encore rejoint d’entreprise.
```

---

# 🏢 Companies

## RPC — create_company

### Objectif

Créer une entreprise et ajouter automatiquement le créateur comme membre.

### Utilisé par

```txt
Frontend onboarding
Profil utilisateur
Parcours ambassadeur
```

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
    "invite_code": "DIGI-8F3K2",
    "invite_url_path": "/join/DIGI-8F3K2"
  }
}
```

### Erreurs possibles

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
  "error_code": "NOT_AUTHENTICATED",
  "message": "Utilisateur non connecté."
}
```

### Règles backend

```txt
- Générer un invite_code unique
- Créer la company
- Ajouter auth.uid() dans company_members
- Rôle par défaut : member
- Le créateur est stocké dans created_by
```

---

## RPC — join_company_by_invite_code

### Objectif

Permettre à un utilisateur de rejoindre une entreprise depuis un lien d’invitation.

### Utilisé par

```txt
Lien d’invitation
Onboarding
Page join company
```

### Input

```json
{
  "invite_code": "DIGI-8F3K2"
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
  "error_code": "INVALID_INVITE_CODE",
  "message": "Ce lien d’invitation est invalide."
}
```

```json
{
  "success": false,
  "error_code": "NOT_AUTHENTICATED",
  "message": "Utilisateur non connecté."
}
```

### Règles backend

```txt
- Rechercher companies.invite_code
- Ajouter l’utilisateur dans company_members
- Ne jamais créer de doublon
- S’appuyer sur unique(user_id, company_id)
```

---

## VIEW — company_members_with_scores

### Objectif

Retourner les membres d’une entreprise avec leur score.

### Filtre attendu côté frontend

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
  "exact_scores_count": 2,
  "joined_at": "2026-06-01T10:00:00.000Z"
}
```

### Règles backend

```txt
- total_points vaut 0 si aucun point
- exact_scores_count vaut 0 si aucun score exact
- Données triables côté frontend ou via RPC dédiée
```

---

# ⚽ Matches

## VIEW — matches_with_teams

### Objectif

Retourner la liste des matchs avec les informations des équipes.

### Output item

```json
{
  "match_id": "uuid",
  "home_team_id": "uuid",
  "home_team_name": "France",
  "home_team_code": "FRA",
  "home_team_flag_url": null,
  "away_team_id": "uuid",
  "away_team_name": "Brazil",
  "away_team_code": "BRA",
  "away_team_flag_url": null,
  "kickoff_at": "2026-06-11T19:00:00.000Z",
  "stage": "group",
  "status": "scheduled"
}
```

### Règles backend

```txt
- Les matchs sont triés par kickoff_at ASC
- Les matchs sont lisibles par les utilisateurs connectés
```

---

## RPC — get_matches_with_my_predictions

### Objectif

Retourner les matchs enrichis avec le prono de l’utilisateur connecté.

### Utilisé par

```txt
Home
Liste des matchs
Mes pronos
```

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
  "away_team_name": "Brazil",
  "away_team_code": "BRA",
  "kickoff_at": "2026-06-11T19:00:00.000Z",
  "stage": "group",
  "match_status": "scheduled",
  "is_locked": false,
  "prediction_status": "predicted",
  "prediction": {
    "prediction_id": "uuid",
    "home_score": 2,
    "away_score": 1,
    "is_boosted": true,
    "updated_at": "2026-06-10T12:00:00.000Z"
  },
  "result": null,
  "points": null
}
```

### Output si aucun prono

```json
{
  "match_id": "uuid",
  "home_team_name": "France",
  "away_team_name": "Brazil",
  "kickoff_at": "2026-06-11T19:00:00.000Z",
  "match_status": "scheduled",
  "is_locked": false,
  "prediction_status": "not_predicted",
  "prediction": null,
  "result": null,
  "points": null
}
```

### Règles backend

```txt
- Utilise auth.uid()
- Calcule is_locked avec l’heure serveur
- Ne laisse pas le frontend décider du lock
- Inclut points seulement si match_result existe
```

---

# 🎯 Predictions

## RPC — upsert_prediction

### Objectif

Créer ou modifier un pronostic utilisateur avant deadline.

### Utilisé par

```txt
PredictionForm
MatchCard
Page match detail
```

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
    "is_locked": false,
    "updated_at": "2026-06-10T12:00:00.000Z"
  }
}
```

### Erreurs possibles

```json
{
  "success": false,
  "error_code": "MATCH_LOCKED",
  "message": "Ton prono est verrouillé. Bonne chance 😏"
}
```

```json
{
  "success": false,
  "error_code": "INVALID_SCORE",
  "message": "Les scores doivent être des nombres positifs."
}
```

```json
{
  "success": false,
  "error_code": "BOOST_ALREADY_USED",
  "message": "Tu as déjà utilisé ton boost sur un autre match."
}
```

```json
{
  "success": false,
  "error_code": "MATCH_NOT_FOUND",
  "message": "Match introuvable."
}
```

```json
{
  "success": false,
  "error_code": "NOT_AUTHENTICATED",
  "message": "Utilisateur non connecté."
}
```

### Règles backend

```txt
- Utiliser auth.uid()
- Vérifier que le match existe
- Vérifier que now() < kickoff_at - 15 minutes
- Vérifier home_score >= 0
- Vérifier away_score >= 0
- Faire un upsert sur unique(user_id, match_id)
- Si is_boosted = true, vérifier que l’utilisateur n’a pas déjà un autre boost
```

---

## RPC — remove_prediction

### Objectif

Supprimer un pronostic avant deadline.

### Statut MVP

```txt
Optionnel P1
```

### Input

```json
{
  "match_id": "uuid"
}
```

### Output success

```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

### Erreurs possibles

```json
{
  "success": false,
  "error_code": "MATCH_LOCKED",
  "message": "Ce prono ne peut plus être supprimé."
}
```

### Règles backend

```txt
- Supprimer uniquement le prono de auth.uid()
- Refuser la suppression après deadline
```

---

# 🧮 Results & Scoring

## RPC — set_match_result

### Objectif

Insérer le résultat officiel d’un match et passer le match en finished.

### Utilisé par

```txt
Admin simple
Data Football
Backend seed / script manuel
```

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
    "away_score": 1,
    "status": "finished"
  }
}
```

### Erreurs possibles

```json
{
  "success": false,
  "error_code": "NOT_ADMIN",
  "message": "Action réservée aux admins."
}
```

```json
{
  "success": false,
  "error_code": "RESULT_ALREADY_EXISTS",
  "message": "Un résultat existe déjà pour ce match."
}
```

```json
{
  "success": false,
  "error_code": "INVALID_SCORE",
  "message": "Les scores doivent être des nombres positifs."
}
```

```json
{
  "success": false,
  "error_code": "MATCH_NOT_FOUND",
  "message": "Match introuvable."
}
```

### Règles backend

```txt
- Seul un admin peut appeler cette RPC
- Un seul résultat par match
- home_score >= 0
- away_score >= 0
- Mettre matches.status = finished
- Les scores sont recalculés via vues, pas stockés manuellement
```

---

## VIEW — user_scores

### Objectif

Calculer les points totaux par utilisateur.

### Output item

```json
{
  "user_id": "uuid",
  "total_points": 12,
  "exact_scores_count": 2,
  "correct_result_count": 1,
  "wrong_prediction_count": 3
}
```

### Règles de calcul

```txt
Score exact = 5 points
Bon résultat = 2 points
Mauvais résultat = 0 point
Boost = points x2
```

### Notes

```txt
Cette vue peut étendre la version MVP du data model en ajoutant exact_scores_count.
Si l’équipe veut rester ultra MVP, exact_scores_count peut être P1.
```

---

## VIEW — prediction_points

### Objectif

Calculer les points par prediction, utile pour “Mes pronos”.

### Output item

```json
{
  "prediction_id": "uuid",
  "user_id": "uuid",
  "match_id": "uuid",
  "home_score": 2,
  "away_score": 1,
  "is_boosted": true,
  "result_home_score": 2,
  "result_away_score": 1,
  "base_points": 5,
  "final_points": 10,
  "is_exact_score": true,
  "is_correct_result": true
}
```

### Règles backend

```txt
- Ne retourne des points que si match_result existe
- Sert aussi de base pour user_scores
```

---

# 🏆 Leaderboards

## RPC — get_global_leaderboard

### Objectif

Retourner le classement global des utilisateurs.

### Input

```json
{
  "limit_count": 50
}
```

### Output item

```json
{
  "rank": 1,
  "user_id": "uuid",
  "username": "Louis",
  "avatar_url": null,
  "company_id": "uuid",
  "company_name": "Digitalizers",
  "total_points": 32,
  "exact_scores_count": 4
}
```

### Règles backend

```txt
- Trier par total_points DESC
- Puis exact_scores_count DESC
- Puis user_id ASC
- Retourner maximum 100 résultats pour éviter les abus
```

---

## RPC — get_company_leaderboard

### Objectif

Retourner le classement individuel dans une entreprise.

### Input

```json
{
  "company_id": "uuid"
}
```

### Output item

```json
{
  "rank": 1,
  "user_id": "uuid",
  "username": "Louis",
  "avatar_url": null,
  "total_points": 32,
  "exact_scores_count": 4
}
```

### Erreurs possibles

```json
{
  "success": false,
  "error_code": "COMPANY_NOT_FOUND",
  "message": "Entreprise introuvable."
}
```

### Règles backend

```txt
- Filtrer sur company_id
- Trier par total_points DESC
- Puis exact_scores_count DESC
- Puis user_id ASC
```

---

## RPC — get_company_ranking

### Objectif

Retourner le classement des entreprises.

### Input

```json
{
  "limit_count": 50
}
```

### Output item

```json
{
  "rank": 1,
  "company_id": "uuid",
  "company_name": "Digitalizers",
  "avg_points": 18.4,
  "member_count": 12
}
```

### Règles backend

```txt
- Score entreprise = moyenne des points des membres
- Trier par avg_points DESC
- Puis member_count DESC
- Puis company_id ASC
- Les entreprises sans points peuvent apparaître avec avg_points = 0
```

---

# 📩 Invitations

## VIEW — company_invite_info

### Objectif

Retourner les informations minimales d’une entreprise depuis un invite_code.

### Utilisé par

```txt
Page /join/:invite_code
Preview avant connexion
```

### Input logique

```txt
invite_code
```

### Output

```json
{
  "company_id": "uuid",
  "company_name": "Digitalizers",
  "invite_code": "DIGI-8F3K2",
  "member_count": 12
}
```

### Règles backend

```txt
- Ne retourne aucune donnée sensible
- Sert à afficher : “Tu vas rejoindre Digitalizers”
```

---

# 🧪 QA Contracts

## Cas critiques à tester

### Auth / Profile

```txt
- Un utilisateur connecté peut créer son profil
- Un utilisateur ne peut modifier que son profil
- username vide refusé
```

### Company

```txt
- Création entreprise OK
- invite_code unique
- Créateur ajouté comme membre
- Join via invite_code OK
- Join via mauvais code refusé
- Join en doublon ne duplique pas
```

### Predictions

```txt
- Création prono avant deadline OK
- Modification prono avant deadline OK
- Création prono après deadline refusée
- Modification prono après deadline refusée
- Score négatif refusé
- Deux pronos sur le même match impossibles
```

### Boost

```txt
- Premier boost accepté
- Deuxième boost refusé
- Boost après deadline refusé
- Boost pris en compte dans les points
```

### Results / Scoring

```txt
- Résultat inséré par admin OK
- Résultat inséré par non-admin refusé
- Score exact = 5 points
- Bon résultat = 2 points
- Mauvais résultat = 0 point
- Boost double les points
```

### Leaderboards

```txt
- Leaderboard global trié correctement
- Leaderboard entreprise filtré correctement
- Classement entreprise basé sur moyenne des membres
- Égalités départagées par exact_scores_count si disponible
```

---

# 🚫 Hors scope API MVP

Ces contrats ne doivent pas être créés pour le MVP sans validation PO :

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

---

# ✅ Definition of Done API Contracts

Ce fichier est validé si :

```txt
- Le frontend sait quoi appeler
- Le backend sait quoi créer
- La data sait quel format fournir
- La QA sait quoi tester
- Aucun agent IA n’invente un payload différent
- Les règles critiques restent côté backend
```

---

# 🧠 Rappel

```txt
Un bon contrat API évite 10 réunions.
Un mauvais contrat API crée 10 bugs silencieux.
```

👉 Si une réponse API change, ce fichier doit être mis à jour avant le code.

