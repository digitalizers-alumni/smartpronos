## 1. Phases du tournoi

Tableau : Code DB | Label FR (affichage) | Code source JSON | Nb matchs WC 2026

- group           | Phase de groupes              | group_stage     | 72
- round_of_16     | Huitièmes de finale           | round_of_16     | 8 (après round_of_32)
- quarter_final   | Quarts de finale              | quarter_final   | 4
- semi_final      | Demi-finales                  | semi_final      | 2
- third_place     | Match pour la 3ᵉ place        | third_place     | 1
- final           | Finale                        | final           | 1

## 2. ⚠️ Anomalie à trancher avec le backend

La WC 2026 introduit un `round_of_32` (16 matchs) car le tournoi passe de
32 à 48 équipes. Cette phase N'EST PAS dans le CHECK constraint actuel.

Options à discuter avec l'équipe Backend :
- Option A : ajouter `round_of_32` au CHECK constraint (migration backend)
- Option B : laisser tel quel pour le MVP (seul le group_stage est seedé,
  knockout sera fait post-groupes)

## 3. Convention de localisation

- L'app est mono-langue française au MVP.
- Données DB stockées en anglais (codes techniques + noms d'équipes FIFA).
- Traduction des labels (phases, noms d'équipes) au rendu côté frontend.
- Le frontend affiche TOUJOURS les labels français du tableau §1, jamais
  les codes anglais.

## 4. Mapping noms d'équipes pour l'affichage français

**Décision retenue (à confirmer avec l'équipe demain)** : Option B —
mapping JSON côté frontend, pas de modif DB.

Le fichier `DATA/teams_fr.json` est un mapping COMPLET des 48 équipes
(sous ownership Data). Pour chaque équipe, il fournit le nom à afficher
côté frontend :

    teamsFr[match.home_team_name]

L'équipe est libre de déplacer ce fichier dans
`FRONTEND/src/assets/i18n/teams.fr.json` si elle préfère le maintenir
côté frontend — `git mv` simple, pas de blocage.

### Comment la valeur FR a été décidée pour chaque équipe

Pour chacune des 48 entrées du JSON, la valeur est :

- **Une traduction française** quand l'usage courant l'établit
  (Mexico → Mexique, Germany → Allemagne, Spain → Espagne, Senegal → Sénégal...)
- **Identique au nom anglais** quand il n'y a pas d'équivalent français
  d'usage, ou quand le nom anglais est déjà la forme française
  (Canada → Canada, Brazil → Brazil, Ghana → Ghana, Panama → Panama...)

### Règles éditoriales appliquées

- Pas de diacritiques exotiques : Curacao reste Curacao, Czechia reste Czechia
  (pas de "ç", pas de "č"). On conserve la forme FIFA pour la lisibilité.
- Cas explicite validé par le PO : Turkiye → Turquie
- Bosnie-Herzégovine et Ouzbékistan : traduits (usage français établi)
