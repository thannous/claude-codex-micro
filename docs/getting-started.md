[English](getting-started.md) · [Français](fr/getting-started.md)

# Getting started

This guide does not modify Input until `--apply` is used. Even with `--apply`,
the tool does not click in the interface and does not patch Input's
configuration directly.

## 1. Check the repository

```sh
git status --short
npm ci --no-audit --no-fund
npm run check
```

Preserve any unrelated changes. Local data goes under `.local/`.

## 2. Read-only general probe

```sh
./scripts/probe-macos.sh
node scripts/input-layer.mjs doctor --json
```

The first command reads versions and non-unique HID properties. The second looks
for Input, Claude and the candidate configuration locations.

Compare against
[`local-observation-2026-07-27.md`](codex-micro/local-observation-2026-07-27.md).

## 3. Understand the V1 files

- [`manifest.json`](../profiles/claude-shortcuts/manifest.json): compatibility,
  proof, preservation and installation;
- [`mapping.json`](../profiles/claude-shortcuts/mapping.json): positions,
  shortcuts, colour and AppSense;
- [`layout.svg`](../profiles/claude-shortcuts/assets/layout.svg): preview;
- [`macos.example.json`](../profiles/claude-shortcuts/macos.example.json):
  historical logical contract, aligned with V1.

The community manifest is not an Input export. The main path transforms an
official Input `0.17.3` `*-profile.json` export locally. The study of the Input
`0.17.2` `*-layer.json` format remains historical evidence.

## 4. Export and back up before any change

In Input:

1. check that exactly one `Claude` layer exists, outside index `0`;
2. check that this layer is already linked to Claude Desktop with AppSense;
3. visually inventory the other profiles, layers and links;
4. use **Export Profile**;
5. quit Input.

Then:

```sh
node scripts/input-layer.mjs backup \
  --profile-export "$HOME/Downloads/Mac-profile.json" \
  --json
```

The backup must be verified before installing.

## 5. Inventory and simulate

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

The plan must protect index `0`, select exactly the existing `Claude` layer, and
refuse both its absence and its duplication.

## 6. Guided installation

Read [`installation.md`](installation.md), then — only after review:

```sh
node scripts/input-layer.mjs install \
  --apply \
  --inventory .local/inventories/current.json \
  --profile-export "$HOME/Downloads/Mac-profile.json" \
  --open-input \
  --json
```

Then generate the new profile without modifying the source backup:

```sh
npm run build:profile -- \
  "$HOME/Downloads/Mac-profile.json" \
  "$HOME/Downloads/Claude-macOS-profile.json"
```

Import `Claude-macOS-profile.json` with **Add New**. Never use
`Reset settings`, never replace index `0`, and never recreate an AppSense link.

## 7. Validation and rollback

Test AppSense, the four keys, the dial, the joystick, focus loss and a restart.
The layer export stays an optional publication validation, distinct from the
generated profile.

The primary rollback is re-importing the original `*-profile.json` into Input.
Copying the storage raw is only an explicit secondary fallback.

## 8. Separate BLE track

Read [`ble/protocol.md`](../ble/protocol.md) and
[`ble/feasibility.md`](../ble/feasibility.md). No result from the HID preset
proves Hardware Buddy compatibility.
