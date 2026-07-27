# Profils et presets

Ce dossier est destiné aux configurations communautaires. Il contient
actuellement des contrats logiques, pas des exports Work Louder Input.

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

Un format d'import ne peut atteindre `export-format-verified` qu'après :

1. sauvegarde d'une configuration existante ;
2. installation sur une copie isolée ou un profil de test ;
3. comparaison du mapping obtenu au manifeste ;
4. second passage prouvant l'idempotence ou le refus propre d'un doublon ;
5. restauration vérifiée.

## Ajouter un preset

Créer un dossier au nom stable et descriptif :

```text
profiles/<application-ou-workflow>/
  README.md
  manifest.json
  mapping.json
  schema.json
  assets/                 optionnel, uniquement si redistribuable
```

Pendant la phase de prototype, un fichier unique comme
`macos.example.json` reste accepté. Lorsqu'un preset devient installable, les
responsabilités doivent être séparées :

- `manifest.json` : identité, compatibilité, statut et méthode d'installation ;
- `mapping.json` : touches, cadran, joystick, couleurs et activation ;
- `schema.json` : contrat validable ;
- `README.md` : installation, vérification, retour arrière et limites ;
- `assets/` : aperçu original ou redistribuable, sans marque tierce non
  autorisée.

Le README doit préciser :

- versions macOS, Input, application et firmware observées ;
- application au premier plan attendue ;
- layer ou preset existant utilisé ;
- raccourcis et niveaux de risque ;
- comportement à la perte de focus ;
- contrôles volontairement exclus ;
- méthode de retour arrière.

## Portabilité

Un preset public ne doit pas dépendre :

- d'un chemin utilisateur absolu ;
- d'un port USB ou BLE précis ;
- d'un numéro de série ;
- d'un identifiant local de layer supposé identique chez tous les utilisateurs ;
- d'un export complet contenant les autres profils de l'utilisateur.

Un futur installateur doit proposer un mode de simulation, créer une sauvegarde
avant écriture, appliquer uniquement le delta annoncé et fournir un rollback.

## Règles

- ne pas inclure d'adresse Bluetooth, numéro de série ou identifiant privé ;
- ne pas présenter le JSON comme importable sans preuve ;
- ne pas remplacer un layer ou un lien AppSense existant ;
- séparer les raccourcis globaux des mappings liés au focus ;
- exclure par défaut envoi, suppression et décisions de permission ;
- conserver les sources officielles et la date de validation.
