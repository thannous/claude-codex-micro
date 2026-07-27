# Profils et presets communautaires

Ce dossier sépare trois objets qui ne doivent pas être confondus :

1. le **manifeste communautaire**, portable et lisible ;
2. le **mapping physique**, indépendant des identifiants locaux d'Input ;
3. l'éventuel **export officiel Work Louder**, importable uniquement après un
   round-trip prouvé.

## Structure V1

```text
profiles/
  schema/v1/
    preset-manifest.schema.json
    layer-mapping.schema.json
  <preset>/
    README.md
    manifest.json
    mapping.json
    assets/
    artifacts/
```

Le premier preset est `claude-shortcuts/`.

## Cycle de preuve

| Statut | Signification |
| --- | --- |
| `proposal-not-applied` | contrat, mapping et outils seulement |
| `hardware-observed` | environnement et configuration réelle inventoriés |
| `manually-validated` | layer et AppSense testés sur le matériel déclaré |
| `export-format-verified` | export, import isolé, doublon et rollback reproduits |

Un environnement peut être `hardware-observed` sans que le preset lui-même
quitte `proposal-not-applied`.

## Manifeste

`manifest.json` décrit :

- l'application et le matériel cibles ;
- les versions observées ;
- le niveau de preuve ;
- les layers protégés ;
- la politique de premier emplacement libre ;
- le mécanisme d'installation ;
- l'artefact officiel éventuel ;
- les validations requises et réalisées.

Le manifeste ne contient jamais d'index local supposé universel, de port, de
numéro de série ou de chemin utilisateur.

## Mapping

`mapping.json` décrit :

- les positions physiques stables et lisibles ;
- les raccourcis ou comportements ;
- la couleur du layer ;
- AppSense ;
- les contrôles sans action ;
- les actions sensibles exclues.

Un `inputControlId` peut rester `null` jusqu'à sa vérification dans Input. Il ne
doit pas être deviné à partir d'un autre appareil.

## Artefact officiel

Input `0.17.2` expose `Import layer` et `Export layer` avec des fichiers
`*-layer.json`. Un artefact public doit provenir de ce flux officiel.

Pour atteindre `export-format-verified` :

1. exporter le profile d'origine ;
2. créer et vérifier une sauvegarde locale ;
3. installer le layer sur le premier emplacement libre ;
4. exporter le layer ;
5. assainir l'export avec `scripts/input-layer.mjs sanitize-export` ;
6. l'importer dans une configuration isolée ;
7. comparer chaque contrôle au mapping ;
8. répéter l'import afin de prouver l'idempotence ou un refus propre ;
9. restaurer le profile d'origine ;
10. documenter les versions et résultats.

Un JSON communautaire ne doit jamais être renommé en `*-layer.json` pour donner
l'impression d'être officiellement importable.

## Ajouter un preset

Créer un dossier stable, par exemple :

```text
profiles/figma-macos/
  README.md
  manifest.json
  mapping.json
  assets/layout.svg
  artifacts/README.md
```

Copier les schémas V1 par référence, adapter le mapping, puis exécuter :

```sh
node scripts/validate-presets.mjs
node --test
node scripts/check-doc-links.mjs
git diff --check
```

## Invariants obligatoires

- l'index `0` du layer Codex natif reste protégé ;
- aucun autre profile, layer ou lien AppSense n'est remplacé implicitement ;
- le premier emplacement libre est choisi après inventaire ;
- dry-run et sauvegarde précèdent toute installation ;
- Retour/Entrée, permissions, suppression, push, déploiement et commandes
  destructrices restent absents par défaut ;
- les fichiers bruts restent sous `.local/`, ignoré par Git ;
- toute limitation est publiée sans exagérer le niveau de preuve.
