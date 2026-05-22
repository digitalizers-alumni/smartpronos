# Frontend — Ce dont j'ai besoin des autres équipes

## 1. Clés Supabase (Backend / DevOps) ✅ DONE

```
SUPABASE_URL      = https://ttrgqgxmkeunwpraqhsd.supabase.co
SUPABASE_ANON_KEY = sb_publishable_WJOVpSFssYkv4OWFTt9d_Q_fBU0ujkO
```

**Statut :** ✅ Clés reçues et présentes dans :
- `FRONTEND/src/environments/environment.development.ts`
- `FRONTEND/src/environments/environment.ts`

Reste à ajouter dans Cloudflare Pages → Variables d'environnement pour le déploiement prod.

---

## 2. Configuration du projet Supabase de dev (Backend)

- [ ] ❌ **Désactiver la confirmation d'email** : Auth → Settings → `Confirm email = OFF`
      → Bloquant : les signup ne renvoient pas de session immédiate. L'app reste en mode démo tant que c'est ON.
- [ ] ❌ **Migrations R0 jouées** : Exécuter le schema `03.schema.sql` (ou les migrations Supabase) sur le projet.
      → Tables : `profiles`, `teams`, `matches`, `predictions`, `match_results`, `companies`, `company_members`
      → Views : `matches_with_status`, `user_scores`, `company_scores`, `company_members_with_scores`
      → RPCs : `get_match_list()`, `upsert_prediction()`, `get_global_leaderboard()`, `get_company_leaderboard(uuid)`, `get_companies_leaderboard()`, `create_company()`, `join_company_by_invite_code()`, `create_or_update_profile()`
- [ ] ❌ **Seeds chargés** : Exécuter les seeds équipes + matchs.
      → Avoir au moins quelques équipes et matchs dans la base pour tester le match list.

---

## 3. Profil de test (Backend)

Pas indispensable si la confirmation d'email est OFF — je crée mes propres comptes avec des emails bidon (`test1@test.com`, etc.).

Si besoin d'un profil partagé pour les démos :
- Email : `demo@smartpronos.com`
- Password : à définir ensemble

---

## 4. Route de join par code d'invitation (Backend)

Pour la feature Company (plus tard) — anticiper :
- Format de l'URL : `/join/<invite_code>` (ex: `/join/ABCDEFGH`)
- Cette route affiche le nom de l'entreprise et un bouton "Rejoindre"

---

## Récapitulatif des dépendances actuelles

| Page | Route | Dépend de | Statut |
|---|---|---|---|---|
| Landing | `/` | Rien | ✅ OK |
| Login | `/login` | Clés Supabase + Auth | ⚠️ Clés OK, mais "Confirm email" ON → session non créée |
| Signup | `/signup` | Clés Supabase + Auth | ⚠️ Clés OK, mais "Confirm email" ON → session non créée |
| Match list | `/home/match-list` | Auth + `get_match_list()` + seeds | ❌ Bloqué (schema non exécuté + seeds) |
| Prediction form | `/match/:id/prediction-form` | Auth + `get_match_list()` + `upsert_prediction()` | ❌ Bloqué |
| Match detail | `/match/:id/detail` | Auth + `get_match_list()` | ❌ Bloqué |

**Ce qui fonctionne dès que la config Supabase est prête (confirm email OFF + schema joué + seeds) :**
- Créer un compte, se connecter, se déconnecter ✅ codé
- Voir la liste des matchs avec statut (scheduled/locked/finished) ✅ codé
- Filtrer par statut ✅ codé
- Voir le détail d'un match avec résultat vs prono + points ✅ codé
- Soumettre / modifier un pronostic ✅ codé
- Lock post-deadline (15 min avant le match) ✅ codé
- Voir ses pronostics passés sur la page profil ✅ codé

---

## Priorité des demandes

1. 🔴 **Désactiver confirmation email** — les signup ne donnent pas de session immédiate
2. 🟡 **Migrations schema + seeds joués** — données réelles dans la base
3. 🟢 **Ajout group_name + mise à jour RPC** — nécessaire pour filtres et affichage groupe

---

## 22.05 — Demande DB : groupe spécifique + enrichissement matchs

### Contexte
Le frontend a besoin de filtrer/afficher le groupe spécifique (A, B, C…) des matchs en phase de groupes. Actuellement la table `matches` n'a qu'une colonne `stage` ('group', 'round_of_16', etc.) — pas de quoi distinguer le groupe.

### Demandes backend

**1. Ajouter `group_name text` à `matches`**
```sql
ALTER TABLE matches ADD COLUMN group_name text;
```
- Stocke `'A'`, `'B'`, `'C'`, `'D'`… pour les matchs de poule
- `NULL` pour les phases finales (huitièmes, quarts, etc.)
- Indispensable pour le filtre "par groupe" et l'affichage "Groupe A" sur les cartes

**2. Optionnel : `round_name text` pour l'affichage du tour**
```sql
ALTER TABLE matches ADD COLUMN round_name text;
```
- Ex: `'Phase de groupes'`, `'Huitièmes de finale'`, `'Quarts de finale'`
- Permet au frontend d'afficher le tour sans avoir à le dériver du `stage`
- Si pas ajouté, le frontend fera le mapping côté client

**3. Mettre à jour `get_match_list()` RPC**
- Ajouter `group_name` (et `round_name` si adopté) dans le SELECT du RPC
- Actuellement le RPC ne retourne que `stage` (cf. `03.schema.sql` ligne 816, champ `stage text` dans le type de retour)

**4. Seeds équipes + matchs**
- Enrichir les seeds avec les groupes réels de la CDM 2026
- Gérer les équipes et les matchs de toutes les phases (groupes → finale)

### Dépendance frontend
- Sans `group_name` : le filtre par groupe et l'affichage "Groupe A" restent sur données démo uniquement
- Le modèle `MatchListItem` a déjà un champ `group?: string` prévu côté frontend — prêt à consommer dès que le RPC retourne la donnée
