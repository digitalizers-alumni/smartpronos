# Prochaines étapes — SMART_PRONO (TriBBo)

Session du 12 juin 2026
Branch : `upgrades`

---

## ✅ Déjà fait

- Migration `20260612100000_fix_service_role_grants.sql` créée et pushée (grants service_role + restriction `set_match_result`)
- Edge Function `update-scores` réparée (plus d'erreur de permission)
- Cron activé (appelle l'Edge Function toutes les minutes)
- Frontend polling 30s sur la match-list (`interval(30_000).pipe(startWith(0), switchMap(...))`)
- Renommage "Bon vainqueur" → "Bon résultat" dans 2 fichiers :
  - `FRONTEND/src/app/components/prediction-form/prediction-form.html`
  - `FRONTEND/src/app/pages/landing/landing-page.html`

---

## 🔜 PWA — Prochaine tâche

### Objectif
Permettre d'installer TriBBo sur l'écran d'accueil iPhone avec le logo Tribbo, et que l'app s'ouvre comme une vraie app (pas juste Safari).

### Ce qu'il manque
- [ ] Pas de `manifest.webmanifest`
- [ ] Pas d'icônes PWA (192x192, 512x512, apple-touch-icon)
- [ ] Pas de meta tags iOS dans `index.html`
- [ ] Pas de service worker
- [ ] `@angular/pwa` pas installé

### Procédure recommandée

```bash
# 1. Installer @angular/pwa (génère manifest, icônes, service worker)
ng add @angular/pwa

# 2. Personnaliser public/manifest.webmanifest
#    - name: "TriBBo"
#    - short_name: "TriBBo"
#    - theme_color: "#1D4DFF"
#    - background_color: "#ffffff"

# 3. Vérifier index.html
#    Les meta tags iOS doivent être présents :
#    <meta name="apple-mobile-web-app-capable" content="yes">
#    <meta name="apple-mobile-web-app-status-bar-style" content="default">
#    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
#    <link rel="manifest" href="/manifest.webmanifest">
#    <meta name="theme-color" content="#1D4DFF">

# 4. Vérifier angular.json (assets, serviceWorker)
```

Les icônes PWA seront générées automatiquement par `ng add @angular/pwa` dans `public/`. Sinon, les générer manuellement depuis le logo Tribbo (`src/assets/logo-tribbo-mark.svg` ou `src/assets/logo-tribbo-mark.png`).

---

## 📋 Tâches à venir (dans l'ordre)

### 3. Responsiveness — Micro-fixes
| Où | Quoi |
|---|---|
| `prediction-form.html:16,31` | Inputs scores `w-24 h-24` → `w-20 h-20 sm:w-24 sm:h-24` |
| `match-card.html:3` | `min-h-[240px]` → `min-h-[200px]` ou `min-h-0` |

### 4. WebKit / Performance
- [ ] Convertir les grosses images PNG de la landing page en WebP
  - `public/Et si la (3).png` (3.5 MB !)
  - `public/ChatGPT Image*.png`
- [ ] Ajouter `loading="lazy"` et `width`/`height` sur les images
- [ ] Corriger `overflow: hidden` sur `<html>`/`<body>` (bug scroll Safari iOS)
- [ ] Vérifier le cache HTTP (`public/_headers`)
- [ ] Envisager `PreloadAllModules` ou une stratégie de preloading

### 5. Suppression de compte (sujet backend)
Bug probable : `delete from auth.users` via `security definer` ne marche pas sur Supabase (schéma restreint). Solution : passer par un Edge Function qui utilise `supabase.auth.admin.deleteUser()`. À refiler au backend.

---

## 🔧 Autres points (dépriorisés)
- `round_of_32` dans les contraintes DB (pas bloquant)
- `team_external_mappings` à enrichir (pas urgent)
- Nettoyage vieux tests `TESTS/` (secondaire)
- Interface admin résultats (pas bloquante)
- Page d'invite `/join/:code` (pas nécessaire pour l'instant)
- Mise à jour du `execution_board` (tâche doc)

---

## 🚨 Sécurité — clé service_role

La clé `service_role` a été exposée dans les logs (via `SELECT * FROM cron.job;` dans le SQL Editor). Même si l'Edge Function est en `--no-verify-jwt` (donc pas de risque immédiat), il faudrait la révoquer :

1. Aller sur https://supabase.com/dashboard/project/ttrgqgxmkeunwpraqhsd/settings/api
2. Cliquer **Revoke** sur la clé `service_role`
3. Mettre à jour le cron avec la nouvelle clé :
```sql
SELECT public.schedule_update_scores_cron(
  'https://ttrgqgxmkeunwpraqhsd.supabase.co/functions/v1/update-scores',
  'NOUVELLE_CLÉ',
  '* * * * *'
);
```
