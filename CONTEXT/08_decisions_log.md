# 08 — Decisions Log (Journal des décisions)

## 🎯 Objectif

Tracer **toutes les décisions importantes** du projet afin de :

- garder un historique clair
- éviter les débats répétitifs
- comprendre le "pourquoi" des choix
- aligner toute l'équipe (humains + agents IA)

👉 Si une décision impacte le produit, la data ou les règles, elle doit être loggée ici.

---

## 🧠 Règle d'or

```
Une décision non documentée = une décision qui sera remise en question.
```

---

## 🧱 Format standard d'une décision

```md
## D-XXX — [Titre court]

### Date
YYYY-MM-DD

### Contexte
Pourquoi on devait décider

### Décision
Choix retenu (clair et actionnable)

### Alternatives considérées
- Option A
- Option B

### Pourquoi ce choix
Raisonnement (simplicité, délai, impact, etc.)

### Impact
- Backend
- Frontend
- UX
- Data
- QA

### Statut
Proposée | Validée | Implémentée | Obsolète

### Liens
- PR / commit
- Fichiers context mis à jour
```

---

## 🗂️ Index des décisions

- D-001 — Scoring MVP
- D-002 — Règle de boost (1 par utilisateur)
- D-003 — Verrouillage à T-15 minutes
- D-004 — Score entreprise = moyenne des membres
- D-005 — Pas de stockage des points (vues only)
- D-006 — Teams libres : reportées post-MVP
- D-007 — Statut match calculé dynamiquement
- D-008 — Membres sans prono exclus de la moyenne entreprise
- D-009 — Risques DB acceptés pour le MVP
- D-010 — Création automatique du profile (trigger auth)
- D-011 — Format invite_code et fonction de génération
- D-012 — Boost perdu si match annulé
- D-013 — Statut de match dynamique (upcoming/live/finished)

---

## 📌 Décisions

### D-001 — Scoring MVP

**Date** : 2026-05-04

**Contexte** : Définir un système simple et compréhensible en 30 secondes.

**Décision** :
- Score exact → 5 pts
- Bon résultat (1N2) → 2 pts
- Mauvais → 0 pt

**Alternatives** :
- Système de points plus granulaire
- Bonus par écart de buts

**Pourquoi** :
Simplicité maximale, facile à expliquer et à tester.

**Impact** :
- Backend : logique de scoring
- Frontend : affichage des points
- QA : cas de test simples

**Statut** : Validée

---

### D-002 — Règle de boost (1 par utilisateur)

**Date** : 2026-05-04

**Contexte** : Ajouter un levier fun sans complexifier.

**Décision** :
- 1 boost par utilisateur sur tout le tournoi
- Multiplicateur x2

**Alternatives** :
- 1 boost par journée
- Boosts multiples

**Pourquoi** :
Limiter la complexité et les abus.

**Impact** :
- Backend : champ `is_boosted`
- UX : choix stratégique simple

**Statut** : Validée

---

### D-003 — Verrouillage à T-15 minutes

**Date** : 2026-05-04

**Contexte** : Assurer l'équité des pronos.

**Décision** :
- Lock 15 minutes avant `kickoff_at`

**Alternatives** :
- Lock à T-0
- Lock 1h avant

**Pourquoi** :
Compromis entre flexibilité et équité.

**Impact** :
- Backend : calcul `is_locked`
- Frontend : état UI
- QA : tests de deadline

**Statut** : Validée

---

### D-004 — Score entreprise = moyenne des membres

**Date** : 2026-05-04

**Contexte** : Définir le classement des entreprises.

**Décision** :
- Moyenne des points des membres

**Alternatives** :
- Somme totale
- Top N joueurs

**Pourquoi** :
Équilibre participation vs performance.

**Impact** :
- Backend : vue `company_scores`
- UX : classement équitable

**Statut** : Validée (précisée par D-008)

---

### D-005 — Pas de stockage des points (vues only)

**Date** : 2026-05-05

**Contexte** :
Faut-il stocker les points utilisateurs et entreprises dans des
colonnes (`profiles.total_points`, `companies.avg_points`) plutôt
que de les calculer à la volée via des vues SQL ?

**Décision** :
Les points (utilisateurs et entreprises) ne sont **jamais stockés**.
Calculés à la volée via des **vues SQL** :

```
user_scores         → vue sur predictions + match_results
company_scores      → vue sur user_scores + company_members
matches_with_status → vue avec statut dérivé
```

**Alternatives considérées** :
- A. Colonnes stockées + triggers
- B. Materialized views (rafraîchies automatiquement)
- C. Vues normales ✅ retenue

**Pourquoi** :
- Source de vérité unique : la vue reflète la nouvelle règle
- Pas de désynchro possible : impossible de diverger
- Pas de triggers à maintenir
- Échelle MVP négligeable : 32 000 lignes max → < 5 ms
- Aligné avec `06_ai_agent_rules.md` : "Ne pas stocker des données dérivées inutiles"

**Impact** :
- Backend : implémentation des vues + RPC SECURITY DEFINER
- Frontend : consomme les RPC, ne calcule rien
- UX : aucun impact perçu
- QA : tests focalisés sur la justesse des vues

**Plan de fallback** (si problème de perf futur) :
1. Vue normale (MVP) — état actuel
2. `MATERIALIZED VIEW` avec refresh auto — si latence > 200 ms
3. Colonnes stockées + triggers — uniquement si (2) insuffisant

**Statut** : Validée

**Liens** :
- `03_data_model.md` — section "Vues & calculs"
- `05_business_rules.md` — "Calcul des points uniquement côté backend"

---

### D-006 — Teams libres : reportées post-MVP

**Date** : 2026-05-05

**Contexte** :
Faut-il ajouter un système de "teams" (groupes de joueurs simples,
sans invite_code) en plus du système `companies` ?

**Décision** :
Reporté post-MVP. Le système `companies` + `invite_code` couvre
suffisamment le besoin de groupe pour le MVP.

**Alternatives considérées** :
- A. Garder uniquement `companies` ✅ retenue
- B. Remplacer `companies` par `teams` libres
- C. Hybride `groups.type = 'company' | 'team'`

**Pourquoi** :
- Aligné avec la vision : "battle entre entreprises" comme MOAT
- Pas de US qui le réclame : `02_user_stories.md` ne mentionne que des entreprises
- Évite scope creep : doubler le système = doubler les leaderboards, RLS, vues, UX
- Friction utile : l'invite_code structure la rivalité et crée l'effet viral

**Impact** :
- Aucun changement DB
- Décision tracée pour éviter la réouverture du débat

**Statut** : Reportée (post-MVP)

**Liens** :
- `00_vision.md` — battle entre entreprises
- `01_product_scope.md` — kill list scope creep

---

### D-007 — Statut match calculé dynamiquement (non stocké)

**Date** : 2026-05-05

**Contexte** :
Le `03_data_model.md` initial prévoyait un champ `matches.status`
stocké. Faut-il vraiment stocker ce statut dérivable ?

**Décision** :
Le champ `status` n'est pas stocké sur `matches`. Calculé via une
vue `matches_with_status` :

```sql
status = CASE
  WHEN EXISTS (SELECT 1 FROM match_results WHERE match_id = m.id)
    THEN 'finished'
  WHEN now() >= m.kickoff_at - interval '15 minutes'
    THEN 'locked'
  ELSE 'scheduled'
END
```

**Alternatives considérées** :
- A. Stocker `status` + cron (passe en `locked` à T-15)
- B. Stocker `status` + trigger sur INSERT match_results
- C. Calculer dynamiquement via vue ✅ retenue

**Pourquoi** :
- Cohérent avec D-005 : pas de stockage de données dérivées
- Pas de cron à maintenir : aucun job pour passer en `locked`
- Pas de désynchro : statut toujours à jour
- `kickoff_at` est la source de vérité : tout en découle

**Impact** :
- Backend : vue `matches_with_status` exposée au frontend
- Frontend : consomme la vue, ne calcule pas le statut
- `03_data_model.md` : retirer `status` de la table `matches`

**Statut** : Validée

**Liens** :
- `03_data_model.md` — table `matches`
- `05_business_rules.md` — règles de verrouillage et statuts
- D-005 — pas de stockage des points (même logique)

---

### D-008 — Membres sans prono exclus de la moyenne entreprise

**Date** : 2026-05-05

**Contexte** :
La D-004 définit le score entreprise comme "moyenne des points des
membres". Inclut-on les membres qui n'ont fait aucun prono dans
le calcul de la moyenne ?

**Décision** :
Les membres sans prono résolu sont exclus du calcul.

La vue `company_scores` utilise un `LEFT JOIN`, mais le calcul `AVG`
ignore les `NULL` (membres sans prono), ce qui exclut naturellement
les inactifs de la moyenne.

Deux compteurs exposés :
- `member_count` : tous les inscrits dans l'entreprise
- `active_member_count` : membres avec au moins un prono résolu

**Alternatives considérées** :
- A. Inclure tous (les fantômes comptent comme 0)
- B. Exclure les inactifs ✅ retenue

**Pourquoi** :
- Récompense l'engagement réel : un fantôme ne pénalise pas son entreprise
- Évite l'effet "ramener des inactifs pour gonfler les rangs"
- Plus juste pour les entreprises avec peu d'actifs très engagés
- L'exposition des deux compteurs préserve l'honnêteté UX

**Impact** :
- Backend : vue `company_scores` (LEFT JOIN + AVG ignore NULL)
- Frontend : afficher "X membres (Y actifs) - Z pts/membre actif"
- D-004 : précisée par cette décision (pas contredite)

**Statut** : Validée

**Liens** :
- D-004 — Score entreprise = moyenne des membres
- `03_data_model.md` — vue `company_scores`

---

### D-009 — Risques DB acceptés pour le MVP

**Date** : 2026-05-05

**Contexte** :
À l'issue de la modélisation DB, plusieurs risques résiduels ont
été identifiés. Plutôt que tous les couvrir au MVP, on les acte
explicitement comme acceptés.

**Décision** :
Les risques suivants sont **identifiés, documentés et acceptés**
pour le MVP. Réévaluation post-hackathon si le produit perdure.

**Risques acceptés** :

#### 1. Pas de soft delete
- Risque : suppression de compte/entreprise = perte définitive
- Pourquoi accepté : `deleted_at` partout + filtres = complexité
- Mitigation : backup Supabase quotidien

#### 2. Pas d'audit log
- Risque : impossible de tracer qui a modifié quoi quand
- Pourquoi accepté : table d'audit + triggers = effort important
- Mitigation : `updated_at` permet de voir SI une modif a eu lieu

#### 3. Pas de backup automatisé custom
- Risque : dépendance à Supabase pour la sauvegarde
- Pourquoi accepté : Supabase fournit des backups
- Mitigation : export manuel avant la démo

#### 4. Pas de rate limiting au niveau DB
- Risque : un bot pourrait spammer des INSERT
- Pourquoi accepté : Supabase rate-limit l'API. Hackathon = limité.
- Mitigation : monitoring manuel pendant la démo

#### 5. Pas de validation cross-table SQL pour la deadline
- Risque : la règle T-15 vit dans la RLS et le frontend
- Pourquoi accepté : un trigger dupliquerait la logique
- Mitigation : tests QA explicites sur les bornes T-15

#### 6. Pas de gestion fine des fuseaux horaires
- Risque : si la Data saisit en heure locale au lieu d'UTC,
  toute la chaîne est décalée
- Pourquoi accepté : `timestamptz` + discipline Data = suffisant
- Mitigation : checklist Data Football, test QA spot-check

#### 7. Pas de versioning des règles de scoring
- Risque : changer le barème pendant le tournoi recalcule tout
- Pourquoi accepté : D-001 fige le scoring, pas de changement prévu
- Mitigation : ne pas modifier `user_scores` pendant le tournoi

**Pourquoi accepter ces risques** :
- MVP 3 semaines : couvrir tout = 1-2 semaines de plus
- Audience limitée : pas de menace cyber significative attendue
- Réversibilité : tous adressables post-MVP sans casser le schéma

**Plan de réévaluation** :
Si le produit perdure, ce point doit être ré-ouvert en V2.
Priorités probables :
1. Audit log (sécurité, debug)
2. Soft delete (RGPD, expérience)
3. Versioning scoring (si nouveau tournoi)

**Statut** : Validée

**Liens** :
- `03_data_model.md` — référencer cette décision
- `05_business_rules.md` — règles non couvertes par contrainte SQL

---

### D-010 — Création automatique du profile (trigger auth)

**Date** : 2026-05-05

**Contexte** :
Quand un user s'inscrit via magic link, Supabase crée une ligne dans
`auth.users`. Mais notre table `profiles` est séparée. Comment garantir
qu'une ligne `profiles` est créée pour chaque utilisateur ?

**Décision** :
Trigger Postgres sur `auth.users` qui crée automatiquement la ligne
`profiles` correspondante.

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    'user_' || substr(NEW.id::text, 1, 8)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

Le username temporaire (`user_a1b2c3d4`) est modifiable par l'user
ensuite via US-002.

**Alternatives considérées** :
- A. Trigger Postgres sur `auth.users` ✅ retenue
- B. Code applicatif après confirmation magic link
- C. Edge Function Supabase

**Pourquoi** :
- Atomique : impossible qu'un user existe sans profile
- 0 risque d'oubli : pas de code à maintenir côté backend
- Pattern standard Supabase : documenté et éprouvé
- `SECURITY DEFINER` nécessaire car le trigger tourne dans le contexte
  du nouvel user qui n'a pas encore les droits

**Impact** :
- Backend : aucun code applicatif pour créer le profile
- Frontend : peut compter sur l'existence du profile dès l'auth
- UX : flow auth → app immédiat, sans étape "création profile"
- `02_user_stories.md` US-002 reste valide : l'user modifie
  son pseudo plus tard

**Statut** : Validée

**Liens** :
- `03_data_model.md` — section triggers
- `02_user_stories.md` — US-001, US-002

---

### D-011 — Format invite_code et fonction de génération

**Date** : 2026-05-05

**Contexte** :
Le champ `companies.invite_code` doit être unique, partageable
(URL et oral), et facile à mémoriser. Quel format et qui le génère ?

**Décision** :
Format : 8 caractères alphanumériques majuscules, ambiguïtés exclues.

```
Caractères autorisés : ABCDEFGHJKLMNPQRSTUVWXYZ23456789
Caractères exclus   : I, O, 0, 1 (confusion visuelle/orale)
Longueur            : 8 caractères
Combinaisons        : 32^8 ≈ 10^12 (collision quasi impossible)
```

Génération côté DB via fonction `generate_invite_code()` :

```sql
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text;
  attempts int := 0;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(
        chars, 1 + floor(random() * length(chars))::int, 1
      );
    END LOOP;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM companies WHERE invite_code = result
    );
    attempts := attempts + 1;
    IF attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique invite code';
    END IF;
  END LOOP;
  RETURN result;
END;
$$;
```

Utilisée comme `DEFAULT` sur la colonne :
```sql
invite_code text NOT NULL UNIQUE DEFAULT generate_invite_code()
```

**Alternatives considérées** :
- A. UUID complet (`/join/a1b2c3d4-...`) → moche, illisible
- B. Mix maj/min/chiffres → ambigus à dicter
- C. 8 chars alphanum maj sans ambigus ✅ retenue
- Génération côté backend Node → forcerait un endpoint custom
- Génération côté DB via fonction ✅ retenue (DEFAULT auto)

**Pourquoi** :
- Lisible et dictable : "ACME-2026", "XK7P9M2A"
- Court dans les URLs : `/join/XK7P9M2A`
- Pas de confusion entre `I/1`, `O/0`
- Génération DB-native : DEFAULT auto, 0 code applicatif
- Unicité garantie : retry automatique en cas de collision
- Garde-fou : exception après 10 tentatives

**Impact** :
- Backend : aucun code dédié, juste l'INSERT classique
- Frontend : reçoit l'invite_code dans la réponse INSERT
- UX : URL d'invitation lisible et partageable
- Data : aucun impact

**Statut** : Validée

**Liens** :
- `03_data_model.md` — table `companies`, section fonctions helpers
- `02_user_stories.md` — US-016, US-017

---

### D-012 — Boost perdu si match annulé

**Date** : 2026-05-05

**Contexte** :
Que se passe-t-il si un user a boosté un match qui ne reçoit jamais
de `match_result` (annulation, report indéfini) ? Le boost est-il
restitué ou perdu ?

**Décision** :
Le boost est perdu si le match ne reçoit pas de résultat. Aucun
mécanisme de restitution automatique au MVP.

```
Conséquences :
- predictions.is_boosted reste à true
- L'index unique partiel "one_boost_per_user" considère le boost
  comme "actif"
- L'user ne peut pas en mettre un autre tant que cette ligne existe
```

**Alternatives considérées** :
- A. Boost perdu (pas de restitution) ✅ retenue
- B. Restitution automatique via trigger sur annulation
- C. Possibilité de "déboost" tant que match pas démarré

**Pourquoi** :
- Cohérent avec l'esprit du boost : c'est un pari stratégique,
  perdu si l'événement ne se produit pas
- Simplicité MVP : pas de logique de restitution à coder/tester
- Cohérent avec le scoring : pas de match_result = 0 point,
  multiplicateur sans effet
- Évite les abus : pas de "déboost" en dernière minute

**Cas concrets** :

Cas 1 — Match joué normalement :
Alice boost France-Brésil → match a un score → boost s'applique ✅

Cas 2 — Match annulé / non joué :
Alice boost France-Brésil → pas de match_result inséré
→ 0 point sur ce match
→ Boost "consommé" sans effet
→ Alice ne peut plus en placer un autre

Cas 3 — Match reporté :
Décision opérationnelle Data + PO :
- Si on modifie `kickoff_at` : Alice est lockée ou pas selon nouvelle
  date, son boost reste valide sur le même match
- Si on crée un nouveau match : Alice doit re-prédire (le match_id
  change), son boost reste sur l'ancien match (perdu)

**Impact** :
- Backend : aucun code spécifique
- Frontend : afficher "Boost en jeu sur France-Brésil ⚡"
- Data Football : instruction sur la gestion des reports/annulations
- UX microcopy : au moment du boost, message clair
  "⚠️ Boost définitif — applicable uniquement si le match est joué"

**Plan de mitigation post-MVP** (si nécessaire) :
1. Endpoint admin pour restituer manuellement
2. Trigger automatique sur DELETE match (rare)
3. Système de "déboost" avant kickoff

Aucun de ces points n'est planifié pour le MVP.

**Statut** : Validée

**Liens** :
- `05_business_rules.md` — règles de boost
- `03_data_model.md` — index `one_boost_per_user`
- D-002 — Règle de boost (1 par utilisateur)

---

## 🔄 Process de mise à jour

1. Une décision est prise par le PO
2. Elle est ajoutée ici
3. Le Master of Context met à jour les fichiers concernés
4. L'équipe s'aligne

---

## ⚠️ À éviter

```
- Décider sans tracer
- Modifier une règle sans log
- Multiplier les décisions non validées
```

---

## ✅ Definition of Done

Le decisions log est efficace si :

```
- Les décisions clés sont tracées
- L'équipe comprend les choix
- Les débats ne se répètent pas
- Les agents IA restent alignés
```

---

## 🧠 Rappel

```
Un bon log = moins de débats
Un mauvais log = retour en arrière constant
```

👉 Documenter 2 minutes = gagner 2 heures plus tard

---

### D-013 — Statut de match dynamique (upcoming/live/finished)

**Date** : 2026-05-12

**Contexte** :
La user story US-DA-003 impose d'afficher un statut match simple
(`upcoming`, `live`, `finished`) pour savoir si un pari reste possible.
Le statut doit être calculé dynamiquement à partir de `matches.kickoff_at`
et de l'existence d'une ligne dans `match_results`.

**Décision** :
Le statut n'est pas stocké dans `matches`. Il est calculé dans la vue SQL
`matches_with_status` avec la règle suivante :

```sql
CASE
  WHEN match_results existe pour le match THEN 'finished'
  WHEN kickoff_at > now() THEN 'upcoming'
  ELSE 'live'
END
```

**Alternatives considérées** :
- A. Ajouter une colonne `matches.status` alimentée manuellement ou via cron
- B. Calcul côté frontend à partir des dates/résultats
- C. Vue SQL dynamique côté base ✅ retenue

**Pourquoi** :
- Source de vérité unique en base, cohérente avec l'architecture data
- Zéro risque de désynchronisation entre date, résultat et statut
- Aucune maintenance de job planifié ou trigger de mise à jour
- Lecture simplifiée côté frontend (un seul objet prêt à consommer)

**Impact** :
- Backend : nouvelle vue `matches_with_status`
- Frontend : lit directement le champ `status` calculé
- Data : aucun champ dérivé stocké à maintenir
- QA : tests sur les 3 cas métier (`upcoming`, `live`, `finished`)

**Statut** : Implémentée

**Liens** :
- US-DA-003
- `supabase/migrations/20260512115627_view_matches_with_status.sql`
