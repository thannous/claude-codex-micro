[English](../../research/input-0.17.2-sharing.md) · [Français](input-0.17.2-sharing.md)

# Work Louder Input 0.17.2 — mécanisme de partage observé

## Verdict

Input `0.17.2` possède un flux utilisateur officiel d'import et d'export au
niveau **layer** et **profile**. Les fichiers produits portent respectivement
les suffixes `*-layer.json` et `*-profile.json`.

Cela justifie de privilégier l'import/export officiel plutôt qu'un patch direct
de la base locale. En revanche, le dépôt ne publie pas encore de fichier layer
Codex Micro : aucun export réel n'a été capturé puis réimporté sur le matériel.
Le statut reste donc `proposal-not-applied`.

## Faits vérifiés

### Documentation Work Louder

La page officielle du Codex Micro indique :

- six layers programmables au maximum ;
- un lien AppSense créé avec l'icône de lien, `Auto detect`, puis cinq secondes
  de focus sur l'application cible ;
- `Reset settings` supprime les layers, profils et actions.

Source : <https://worklouder.cc/openai-micro-setup>

### Application distribuée

L'archive officielle inspectée est :

```text
https://github.com/worklouder/input-releases/releases/download/v0.17.2/input-0.17.2-arm64-mac.zip
```

Identité observée :

- SHA-256 de l'archive :
  `72bb2ccd2f0de0b21a61cd4006367a64e628010c3e7303e94f219cff5ad45d35` ;
- bundle macOS : `it.focusense.input-app` ;
- version courte et build : `0.17.2` ;
- package Electron : `input` `0.17.2`.

L'analyse statique assainie du bundle expose les libellés suivants :

- `Import layer` ;
- `Export layer` ;
- `Import Profile` ;
- `Export Profile` ;
- avertissement de langue différente ;
- refus d'un fichier créé pour un autre type de clavier.

L'enveloppe JSON d'un export de layer contient les clés de premier niveau :

```text
keyboard
language
layer
actions
multiactions
smartActions
actionGroups
multiactionGroups
smartActionGroups
```

L'export de profile remplace `layer` par `profile`. Le code packagé utilise
`JSON.stringify`, `Blob` et `URL.createObjectURL` pour l'export, puis
`FileReader`, `JSON.parse` et une copie structurée pour l'import.

## Méthode reproductible

Les workflows suivants téléchargent temporairement l'archive officielle,
extraient `app.asar`, calculent uniquement des métadonnées structurales, puis
suppriment les fichiers propriétaires :

- `.github/workflows/inspect-input-0172.yml` ;
- `.github/workflows/inspect-input-0172-ast.yml`.

Les artefacts CI contiennent uniquement : versions, sommes de contrôle,
libellés bornés, noms de clés, suffixes et résumés AST. Ils ne contiennent ni
code source packagé, ni image, ni firmware, ni identifiant local.

## Décision d'architecture initiale

Cette inspection avait conduit au plan initial suivant :

1. sauvegarde par export officiel du profile **et** copie de la configuration
   locale reconnue ;
2. inventaire depuis le `*-profile.json` officiel ;
3. sélection du premier emplacement libre après l'index protégé `0` ;
4. import du `*-layer.json` officiel lorsqu'un artefact réel aura été vérifié ;
5. procédure guidée manuelle tant que cet artefact manque ;
6. rollback principal par réimport du profile officiel d'origine ;
7. aucun patch direct de `input_storage.json`, Local Storage ou du périphérique
   avant preuve supplémentaire.

Ce plan est conservé comme historique, mais il n'est plus le parcours V1
courant. La V1 actuelle transforme localement un export `*-profile.json`
Input `0.17.3` contenant exactement un layer `Claude` déjà lié avec AppSense.
L'import de layer reste une validation de publication optionnelle.

## Points non encore prouvés

- structure interne complète des objets `layer` et `actions` pour le Codex
  Micro ;
- identifiants physiques affichés par Input pour chaque touche ;
- création puis import du layer Claude sur le périphérique réel ;
- persistance après redémarrage d'Input ;
- retour au layer précédent lors de la perte de focus ;
- restauration effective du keymap matériel par réimport de profile ;
- comportement d'un second import du même layer.

Un vrai fichier `*-layer.json` ne doit être ajouté qu'après les tests décrits
dans `profiles/claude-shortcuts/artifacts/README.md`.
