# Frontend — Ce dont j'ai besoin des autres équipes

## 1. Clés Supabase (Backend / DevOps)

```
SUPABASE_URL      = https://XXXXX.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIs...
```

À mettre dans :
- `FRONTEND/src/environments/environment.development.ts` (dev)
- `FRONTEND/src/environments/environment.ts` (prod)
- Cloudflare Pages → Variables d'environnement pour le déploiement

**Sans ces clés, je ne peux rien tester.** Les pages auth, match list et prediction form sont toutes bloquées.

---

## 2. Configuration du projet Supabase de dev (Backend)

- [ ] **Désactiver la confirmation d'email** : Auth → Settings → `Confirm email = OFF`
      → Sinon je dois attendre un email pour chaque inscription de test.
- [ ] **Migrations R0 jouées** : Vérifier que `20260512140000_release_r0_backend.sql` (et les migrations précédentes) ont été exécutées sur le projet.
      → Tables : `profiles`, `teams`, `matches`, `predictions`, `match_results`, `companies`, `company_members`
      → Views : `matches_with_status`, `user_scores`, `company_scores`, `company_members_with_scores`
      → RPCs : `get_match_list()`, `upsert_prediction()`, `get_global_leaderboard()`, `get_company_leaderboard(uuid)`, `get_companies_leaderboard()`, `create_company()`, `join_company_by_invite_code()`, `create_or_update_profile()`
- [ ] **Seeds chargés** : Exécuter `20260511104742_seed_teams.sql` et `20260511104743_seed_matches.sql`
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
|---|---|---|---|
| Landing | `/` | Rien | ✅ Visible sans backend |
| Login | `/login` | Clés Supabase + Auth | ❌ Bloqué |
| Signup | `/signup` | Clés Supabase + Auth | ❌ Bloqué |
| Match list | `/home/match-list` | Auth (login) + `get_match_list()` + seeds | ❌ Bloqué |
| Prediction form | `/match/:id/prediction-form` | Auth + `get_match_list()` + `upsert_prediction()` | ❌ Bloqué |

**Ce qui fonctionne dès que j'ai les clés :**
- Créer un compte, se connecter, se déconnecter
- Voir la liste des matchs avec statut (scheduled/locked/finished)
- Soumettre un pronostic
- Voir ses pronostics précédents

---

## Priorité des demandes

1. **🔴 SUPABASE_URL + SUPABASE_ANON_KEY** — tout est bloqué sans ça
2. **🟡 Désactiver confirmation email** — gagner du temps en dev
3. **🟢 Migrations + seeds joués** — avoir des vraies données à afficher
