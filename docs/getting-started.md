# Guide de démarrage

Ce guide ne modifie pas Input tant que `--apply` n'est pas utilisé. Même avec
`--apply`, l'outil ne clique pas dans l'interface et ne patche pas directement
la configuration d'Input.

## 1. Contrôler le dépôt

```sh
git status --short
npm ci --no-audit --no-fund
npm run check
```

Préserver toute modification sans rapport. Les données locales vont sous
`.local/`.

## 2. Sonde générale en lecture seule

```sh
./scripts/probe-macos.sh
node scripts/input-layer.mjs doctor --json
```

La première commande lit les versions et propriétés HID non uniques. La seconde
cherche Input, Claude et les emplacements de configuration candidats.

Comparer avec
[`local-observation-2026-07-27.md`](codex-micro/local-observation-2026-07-27.md).

## 3. Comprendre les fichiers V1

- [`manifest.json`](../profiles/claude-shortcuts/manifest.json) : compatibilité,
  preuve, préservation et installation ;
- [`mapping.json`](../profiles/claude-shortcuts/mapping.json) : positions,
  raccourcis, couleur et AppSense ;
- [`layout.svg`](../profiles/claude-shortcuts/assets/layout.svg) : aperçu ;
- [`macos.example.json`](../profiles/claude-shortcuts/macos.example.json) :
  contrat logique historique aligné sur V1.

Le manifeste communautaire n'est pas un export Input. Le parcours principal
transforme localement un export officiel `*-profile.json` d'Input `0.17.3`.
L'étude du format `*-layer.json` d'Input `0.17.2` reste une preuve historique.

## 4. Exporter et sauvegarder avant toute modification

Dans Input :

1. vérifier qu'il existe exactement un layer `Claude`, hors index `0` ;
2. vérifier que ce layer est déjà lié à Claude Desktop avec AppSense ;
3. inventorier visuellement les autres profils, layers et liens ;
4. utiliser **Export Profile** ;
5. quitter Input.

Puis :

```sh
node scripts/input-layer.mjs backup \
  --profile-export "$HOME/Downloads/Mac-profile.json" \
  --json
```

La sauvegarde doit être vérifiée avant l'installation.

## 5. Inventorier et simuler

```sh
node scripts/input-layer.mjs inventory \
  --profile-export "$HOME/Downloads/Mac-profile.json" \
  --output .local/inventories/current.json \
  --json

node scripts/input-layer.mjs install \
  --inventory .local/inventories/current.json \
  --profile-export "$HOME/Downloads/Mac-profile.json" \
  --dry-run \
  --json
```

Le plan doit protéger l'index `0`, sélectionner exactement le layer `Claude`
existant et refuser son absence ou sa duplication.

## 6. Installation guidée

Lire [`installation.md`](installation.md), puis seulement après revue :

```sh
node scripts/input-layer.mjs install \
  --apply \
  --inventory .local/inventories/current.json \
  --profile-export "$HOME/Downloads/Mac-profile.json" \
  --open-input \
  --json
```

Générer ensuite le nouveau profile sans modifier la sauvegarde source :

```sh
npm run build:profile -- \
  "$HOME/Downloads/Mac-profile.json" \
  "$HOME/Downloads/Claude-macOS-profile.json"
```

Importer `Claude-macOS-profile.json` avec **Add New**. Ne jamais utiliser
`Reset settings`, remplacer l'index `0` ou recréer un lien AppSense.

## 7. Validation et retour arrière

Tester AppSense, les quatre touches, le cadran, le joystick, la perte de focus
et le redémarrage. L'export de layer reste une validation de publication
optionnelle, distincte du profile généré.

Le rollback principal consiste à réimporter le `*-profile.json` original dans
Input. La copie brute du stockage n'est qu'un recours secondaire explicite.

## 8. Piste BLE séparée

Lire [`ble/protocol.md`](../ble/protocol.md) et
[`ble/feasibility.md`](../ble/feasibility.md). Aucun résultat du preset HID ne
prouve la compatibilité Hardware Buddy.
