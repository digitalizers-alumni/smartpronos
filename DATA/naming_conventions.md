# Conventions de nommage — Data Football

## Équipes (table `teams`)

### Champ `name` (anglais)

- Source de vérité pour les JOIN et les seeds
- Format : nom officiel FIFA en anglais (ex: `Brazil`, `Turkiye`, `Curacao`)
- Aucun accent, aucun caractère spécial
- UNIQUE, NOT NULL
- Utilisé pour : `seed_matches.sql`, imports API, jointures

### Champ `name_fr` (français)

- Affichage côté frontend uniquement
- Format : nom officiel français (ex: `Brésil`, `Turquie`, `Curaçao`)
- Accents et caractères spéciaux autorisés
- UNIQUE, NOT NULL
- Source de vérité : la base (peuplée via migration depuis `DATA/teams_fr.json`)

### Champ `code`

- Trigramme FIFA d'usage courant (ex: `BRA`, `ENG`, `GER`, `NED`, `KSA`)
- 3 lettres majuscules
- UNIQUE, NOT NULL, contrainte `length(code) = 3`
- ⚠️ Pas strictement ISO 3166-1 alpha-3 : on suit l'usage FIFA pour
  cohérence métier (maillots, retransmissions)
- Exemples de divergences ISO vs FIFA :
  - Allemagne : DEU (ISO) → GER (FIFA)
  - Pays-Bas : NLD (ISO) → NED (FIFA)
  - Suisse : CHE (ISO) → SUI (FIFA)
  - Croatie : HRV (ISO) → CRO (FIFA)
  - Portugal : PRT (ISO) → POR (FIFA)
  - Arabie Saoudite : SAU (ISO) → KSA (FIFA)
  - Afrique du Sud : ZAF (ISO) → RSA (FIFA)
  - Uruguay : URY (ISO) → URU (FIFA)

### Champ `flag_url`

- URL flagcdn 320px (`https://flagcdn.com/w320/<iso2>.png`)
- Optionnel mais recommandé
- Pour England / Scotland : `gb-eng`, `gb-sct`

## Règle générale

- Toute insertion ou modification d'équipe doit respecter ces conventions
- Toute nouvelle équipe doit être ajoutée à `DATA/teams_seed.csv` ET dans une
  migration SQL versionnée
- Le mapping FR vit en DB (`name_fr`). `DATA/teams_fr.json` est conservé comme
  référence éditoriale historique mais n'est plus consommé directement.

## Référence

- US-DA-004 (seed équipes)
- US-DA-005 (nom FR + conventions)
- D-014, D-015 dans `CONTEXT/08_decisions_log.md`
