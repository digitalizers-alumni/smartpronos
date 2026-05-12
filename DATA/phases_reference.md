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

## 4. Noms d'équipes — convention de localisation

Le nom français d'affichage des équipes vit en base via la colonne
`teams.name_fr` (migration `20260512140000_add_team_name_fr.sql`).

### Architecture

- **`teams.name`** (anglais) : source FIFA, utilisée pour les jointures,
  les seeds, et l'identification technique
- **`teams.name_fr`** (français) : utilisée par le frontend pour l'affichage

Le frontend lit `teams.name_fr` directement via le RPC `get_match_list()`
ou les vues. Aucun mapping côté client n'est nécessaire.

### Convention de traduction appliquée

Les noms français usuels sont utilisés, avec leurs diacritiques quand
l'usage courant les impose :
- Brésil, Sénégal, Équateur, Égypte, Allemagne, Suède...
- Tchéquie (pas Czechia), Curaçao (pas Curacao), Jordanie (pas Jordan)
- Côte d'Ivoire, Cap-Vert, Pays-Bas, États-Unis, Bosnie-Herzégovine,
  Ouzbékistan, RD Congo

Les pays sans équivalent français usuel gardent leur nom anglais :
Canada, Brazil → Brésil mais Panama, Ghana, Iran, Iraq, Qatar, Paraguay,
Uruguay, Haïti (avec accent), Uzbekistan → Ouzbékistan...

La liste complète des 48 mappings est dans la migration
`20260512140000_add_team_name_fr.sql`.

### Modification d'une traduction

Pour corriger ou ajouter une traduction, créer une nouvelle migration
SQL avec un `UPDATE` sur `teams.name_fr`. Ne jamais modifier en place
la migration historique.
