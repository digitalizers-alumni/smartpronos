# 03 — Data Model (Supabase)

## 🎯 Objectif

Définir une structure de données **simple, cohérente et suffisante** pour livrer le MVP en 3 semaines.

👉 Principes :
- Simplicité > perfection
- Peu de tables, bien pensées
- Noms explicites
- Calculs côté backend (SQL / RPC)

---

## 🧱 Vue d’ensemble

```
profiles ──< company_members >── companies
profiles ──< predictions >── matches ──< match_results
teams ──< matches >── teams
companies ──< company_scores (view)
profiles ──< user_scores (view)
```

---

## 📚 Tables

### 1. profiles

Stocke les utilisateurs.

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text not null,
  avatar_url text,
  created_at timestamp with time zone default now()
);
```

---

### 2. companies

```sql
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  created_by uuid references profiles(id),
  created_at timestamp with time zone default now()
);
```

---

### 3. company_members

Relation user ↔ entreprise.

```sql
create table company_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  role text default 'member',
  created_at timestamp with time zone default now(),
  unique (user_id, company_id)
);
```

---

### 4. teams

```sql
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique, -- FRA, BRA
  flag_url text
);
```

---

### 5. matches

```sql
create table matches (
  id uuid primary key default gen_random_uuid(),
  home_team_id uuid references teams(id),
  away_team_id uuid references teams(id),
  kickoff_at timestamp with time zone not null,
  stage text, -- group, round_of_16, etc.
  status text default 'scheduled', -- scheduled | locked | finished
  created_at timestamp with time zone default now()
);
```

---

### 6. predictions

```sql
create table predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  match_id uuid references matches(id) on delete cascade,
  home_score integer not null,
  away_score integer not null,
  is_boosted boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (user_id, match_id)
);
```

---

### 7. match_results

```sql
create table match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid unique references matches(id) on delete cascade,
  home_score integer not null,
  away_score integer not null,
  created_at timestamp with time zone default now()
);
```

---

## 🧮 Vues & calculs

### 1. user_scores (view)

Calcule les points par utilisateur.

```sql
create view user_scores as
select
  p.user_id,
  sum(
    case
      when mr.home_score = p.home_score and mr.away_score = p.away_score then 5
      when (mr.home_score > mr.away_score and p.home_score > p.away_score)
        or (mr.home_score < mr.away_score and p.home_score < p.away_score)
        or (mr.home_score = mr.away_score and p.home_score = p.away_score)
      then 2
      else 0
    end * (case when p.is_boosted then 2 else 1 end)
  ) as total_points
from predictions p
join match_results mr on mr.match_id = p.match_id
group by p.user_id;
```

---

### 2. company_scores (view)

```sql
create view company_scores as
select
  cm.company_id,
  avg(us.total_points) as avg_points
from company_members cm
join user_scores us on us.user_id = cm.user_id
group by cm.company_id;
```

---

## 🔒 Règles importantes

### 1. Un seul prono par match

```
unique (user_id, match_id)
```

---

### 2. Lock des pronos

À gérer via logique backend :

```
match.kickoff_at - 15 minutes
```

---

### 3. Boost

MVP simple :

- 1 boost autorisé par utilisateur
- champ is_boosted = true

👉 règle plus complexe = hors scope

---

## 🔐 RLS (Row Level Security)

### profiles

- user peut lire son profil
- user peut modifier son profil

### predictions

- user peut lire ses predictions
- user peut créer/modifier ses predictions (avant lock)

### matches

- lecture publique

### match_results

- lecture publique
- écriture admin uniquement

### companies

- lecture publique
- création autorisée

---

## ⚠️ Pièges à éviter

```
- multiplier les tables inutiles
- stocker des calculs (toujours recalculer)
- gérer le scoring côté frontend
- complexifier le boost
- créer une relation trop compliquée
```

---

## ✅ Definition of Done

Le data model est validé si :

```
- un user peut être créé
- un user peut rejoindre une entreprise
- les matchs sont stockés
- un prono peut être enregistré
- un résultat peut être ajouté
- les points sont calculés correctement
- les leaderboards fonctionnent
```

👉 Si ça