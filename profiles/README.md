[English](README.md) · [Français](README.fr.md)

# Community profiles and presets

This folder separates three objects that must not be conflated:

1. the **community manifest**, portable and readable;
2. the **physical mapping**, independent of Input's local identifiers;
3. the possible **official Work Louder export**, importable only after a proven
   round-trip.

## V1 structure

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

The first preset is `claude-shortcuts/`.

## Proof cycle

| Status | Meaning |
| --- | --- |
| `proposal-not-applied` | contract, mapping and tools only |
| `hardware-observed` | environment and real configuration inventoried |
| `manually-validated` | layer and AppSense tested on the declared hardware |
| `export-format-verified` | export, isolated import, duplicate and rollback reproduced |

An environment can be `hardware-observed` without the preset itself leaving
`proposal-not-applied`.

## Manifest

`manifest.json` describes:

- the target application and hardware;
- the observed versions;
- the level of proof;
- the protected layers;
- the policy for selecting a single existing layer;
- the installation mechanism;
- the official artefact, if any;
- the validations required and carried out.

The manifest never contains a local index assumed to be universal, a port, a
serial number or a user path.

## Mapping

`mapping.json` describes:

- the stable, readable physical positions;
- the shortcuts or behaviours;
- the layer colour;
- AppSense;
- the controls with no action;
- the sensitive actions excluded.

An `inputControlId` may stay `null` until it is verified in Input. It must not be
guessed from another device.

## Official artefact

Input `0.17.2` exposes `Import layer` and `Export layer` with `*-layer.json`
files. A public artefact must come from that official flow.

To reach `export-format-verified`:

1. export the original profile;
2. create and verify a local backup;
3. transform a copy of the profile containing exactly one target layer;
4. export the layer;
5. sanitise the export with `scripts/input-layer.mjs sanitize-export`;
6. import it into an isolated configuration;
7. compare every control against the mapping;
8. repeat the import to prove idempotence, or a clean refusal;
9. restore the original profile;
10. document the versions and results.

A community JSON must never be renamed to `*-layer.json` to give the impression
that it is officially importable.

## Adding a preset

Create a stable folder, for example:

```text
profiles/figma-macos/
  README.md
  manifest.json
  mapping.json
  assets/layout.svg
  artifacts/README.md
```

Copy the V1 schemas by reference, adapt the mapping, then run:

```sh
node scripts/validate-presets.mjs
node --test
node scripts/check-doc-links.mjs
git diff --check
```

## Mandatory invariants

- index `0` of the native Codex layer stays protected;
- no other profile, layer or AppSense link is replaced implicitly;
- the target layer exists exactly once, outside index `0`, before the
  transformation;
- its existing AppSense link is preserved;
- a dry run and a backup precede any installation;
- Return/Enter, permissions, deletion, push, deployment and destructive commands
  stay absent by default;
- raw files stay under `.local/`, which Git ignores;
- every limitation is published without overstating the level of proof.
