# Profils et presets

Ce dossier contient des contrats logiques, pas des exports Work Louder Input.

## Preset disponible

```text
claude-shortcuts/
  README.md
  macos.example.json
  schema.json
```

`macos.example.json` décrit :

- l'application cible ;
- l'activation AppSense liée au focus ;
- la stratégie de sélection d'un layer existant ;
- les contrôles attendus ;
- les raccourcis globaux hors du layer ;
- les actions sensibles exclues.

## Cycle de vie

Un preset passe idéalement par les états suivants :

1. `proposal-not-applied` : documentation seulement ;
2. `hardware-observed` : layer et version Input inventoriés ;
3. `manually-validated` : comportement testé sur une combinaison précise ;
4. `export-format-verified` : uniquement si un export natif a été confirmé.

Le preset actuel reste au premier état. Aucun statut supérieur ne doit être
utilisé sans preuve reproductible.

## Ajouter un preset

Créer un dossier au nom stable et descriptif :

```text
profiles/<application-ou-workflow>/
  README.md
  macos.example.json
  schema.json
```

Le README doit préciser :

- versions macOS, Input, application et firmware observées ;
- application au premier plan attendue ;
- layer ou preset existant utilisé ;
- raccourcis et niveaux de risque ;
- comportement à la perte de focus ;
- contrôles volontairement exclus ;
- méthode de retour arrière.

## Règles

- ne pas inclure d'adresse Bluetooth, numéro de série ou identifiant privé ;
- ne pas présenter le JSON comme importable sans preuve ;
- ne pas remplacer un layer ou un lien AppSense existant ;
- séparer les raccourcis globaux des mappings liés au focus ;
- exclure par défaut envoi, suppression et décisions de permission ;
- conserver les sources officielles et la date de validation.
