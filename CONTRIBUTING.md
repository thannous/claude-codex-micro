[English](CONTRIBUTING.md) · [Français](CONTRIBUTING.fr.md)

# Contributing

## Project status

The repository is public and experimental. The MIT licence and the holder
`Thanh Chau` are confirmed. No preset becomes installable or stable without
reproducible proof.

A contribution can improve a proposal, provide hardware evidence, add a safety
tool, or introduce a real sanitised official export. Its level of proof must stay
explicit throughout the review.

## Proposing a new preset

Start with the GitHub "Preset proposal" template, including:

- the target application or workflow;
- the hardware, the operating system, the Input version and the firmware;
- the key-by-key mapping;
- the activation method, AppSense in particular;
- the intended installation method;
- the backup and the rollback;
- the sensitive actions deliberately excluded.

Then place the preset in `profiles/<application-or-workflow>/` following
[`profiles/README.md`](profiles/README.md).

## Architecture

Every stable preset separates:

- `manifest.json`: identity, compatibility, proof and installation policy;
- `mapping.json`: physical positions, actions, colour and activation;
- `assets/`: original or redistributable visuals;
- `artifacts/`: only a sanitised, verified official export;
- `README.md`: installation, tests, limits and rollback.

The common schemas live in `profiles/schema/v1/`. The BLE track stays separate
under `ble/`.

## Preparing the environment

Prerequisite: Node.js 18 or newer. The validation dependencies are pinned by
`package-lock.json`.

```sh
npm ci --no-audit --no-fund
npm run check
git diff --check
```

The checks run:

- the historical Claude contract validator;
- the manifest and mapping validator;
- local link verification;
- the backup, rollback, sanitisation and idempotence tests on fixtures.

They modify neither Input, nor the keyboard, nor macOS.

## Modifying or adding a preset

1. keep `proposal-not-applied` without hardware evidence;
2. protect index `0` and never assume a local identifier is universal;
3. require exactly one existing target layer, outside index `0`;
4. preserve its AppSense link in the local copy without publishing it;
5. leave unused controls without an action, or reserved;
6. exclude sending, permissions, deletion, push, deployment and destructive
   commands;
7. document versions, date, proof and any negative result;
8. run `npm run check` and `git diff --check`.

## Adding an official export

A `*-layer.json` file must come from **Export layer** in Work Louder Input. Never
fabricate the internal objects from the manifest.

Before committing:

```sh
node scripts/input-layer.mjs inspect-export \
  --input "$HOME/Downloads/My-layer.json" \
  --json

node scripts/input-layer.mjs sanitize-export \
  --input "$HOME/Downloads/My-layer.json" \
  --output profiles/<preset>/artifacts/my-layer.json
```

The public file must then go through:

1. import into an isolated configuration;
2. control-by-control comparison against the mapping;
3. binding the file to the SHA-256 declared in the manifest;
4. semantic validation against the canonical mapping;
5. a second import proving idempotence, or a clean refusal;
6. rollback through the original profile;
7. a fresh export and comparison of sums and structures.

The raw copy, the original profile, private screenshots, local paths, ports,
Bluetooth addresses, serial numbers, hardware identifiers and secrets stay under
`.local/` and out of Git.

## Providing hardware evidence

For AppSense, document at minimum:

- the Input, firmware, macOS and application versions;
- the displayed name and the detected application;
- the index of the single Claude layer, and proof that index `0` is intact;
- the result for every key, the dial and the joystick;
- the active layer with and without Claude focused;
- persistence after a restart;
- other AppSense links preserved, without publishing their private data;
- restoration of the original profile.

An inconclusive result must stay marked as such.

## BLE track

A BLE contribution must not present Hardware Buddy as compatible without evidence
of the Nordic UART service, of HID + NUS coexistence, of restorable firmware and
of a safe permission strategy. No proprietary firmware or flashing tool may be
added.

## Review checklist

- [ ] Change limited to the stated need.
- [ ] Layer `0`, other layers, profiles and AppSense links preserved.
- [ ] Exact level of proof.
- [ ] Official sources tied to the corresponding claim.
- [ ] No secret, private path or unique hardware identifier.
- [ ] `npm run check` passes.
- [ ] `git diff --check` passes.
- [ ] Backup and rollback documented.
- [ ] Import status confirmed by evidence, or marked as unverified.
- [ ] No proprietary asset or firmware.

Read [SECURITY.md](SECURITY.md) before publishing a sensitive report.
