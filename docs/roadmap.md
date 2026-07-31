[English](roadmap.md) · [Français](fr/roadmap.md)

# Roadmap

## Current state

The public repository now contains:

- a community manifest and a Claude physical mapping;
- reusable schemas for future presets;
- an original SVG representation;
- an inventory, backup, dry-run, sanitisation and rollback tool;
- a local Input `0.17.3` profile generator that preserves AppSense;
- transactional tests on isolated copies;
- a reproducible analysis of the Input `0.17.2` sharing format;
- a separate BLE track, explicitly not working.

The real official Claude `*-layer.json` export and full hardware validation are
still missing. The preset therefore keeps the `hardware-observed` status.

## V1 — verified Claude preset

Goal: obtain a first reproducible layer without modifying the native Codex
layer.

- [ ] run `git status --short` in the local copy and preserve unrelated changes;
- [x] export the real Input profile and inventory profiles, layers, actions and
  AppSense links;
- [x] provide a verified local backup and a transactional rollback;
- [x] identify the official layer and profile Import/Export flows of Input
  `0.17.2`;
- [x] define the manifest, the physical mapping, the colour and the exclusions;
- [x] protect index `0`, require a single existing Claude layer and preserve its
  AppSense;
- [x] generate a new Input `0.17.3` profile locally;
- [ ] verify the positions, the keys, the dial and the joystick;
- [ ] verify AppSense, focus loss and competing links;
- [ ] verify persistence after an Input restart;
- [ ] export and sanitise the real `*-layer.json`;
- [ ] test the import on an isolated configuration, and the second import;
- [ ] restore the original profile and verify the device;
- [ ] promote the level of proof and take the PR out of draft.

V1 is finished only if another person can reproduce the result without a local
identifier and without implicitly replacing a layer.

## V2 — general portability

The minimal foundations are already present, but are not declared stable:

- [x] common manifest and V1 schemas;
- [x] simulation, backup, sanitisation and rollback tests on fixtures;
- [x] selection of a single existing layer, refusing absence and duplication;
- [x] visual preview of the mapping;
- [ ] support for a verified official artefact;
- [ ] structural before/after comparison from real exports;
- [ ] detection of Input/firmware incompatibilities;
- [ ] hardware validation log signed by versions and checksums;
- [ ] automation of the official rollback if Input exposes a supported channel.

Patching Input's storage directly will not become the normal path until its
format and its effect on the device are proven.

## V3 — community catalogue

- add a "Claude Code" (terminal) preset as the natural first candidate;
- add IDE, browser, search, Figma and Framer presets;
- index presets by application, platform and compatibility;
- use the GitHub proposal and pull request templates;
- require a backup and rollback method;
- publish known negative results and incompatibilities;
- allow several physical representations without local identifiers.

## V4 — simplified experience

- catalogue readable from a dedicated interface;
- interactive keyboard preview;
- before/after comparison;
- guided installation with explicit consent;
- versioned updates that do not overwrite local customisations.

## Parallel track: Hardware Buddy

The BLE research stays independent. It only joins the main roadmap if the Nordic
UART service, HID coexistence and a safe restore procedure are demonstrated on
the exact Codex Micro.

## Parallel track: Claude Code session status

A second track covers the six Agent keys: showing the state of local Claude Code
sessions and jumping to the right one. Unlike Hardware Buddy, both of its core
building blocks rest on documented mechanisms — the `claude agents --json`
roster and the hooks — and are implemented:

- [x] hooks plugin and publishable journal
  ([`thread-status/`](../thread-status/README.md));
- [x] six-slot reducer, tested without hardware;
- [x] `watch` / `status` / `focus` / `doctor` companion;
- [ ] focusing a terminal-hosted session, verified end to end;
- [x] Agent key press wired to `focus <n>`: the keys emit `v.oai.hid` with `k`
  set to `AG00` through `AG05`, so no native global shortcut is needed —
  `npm run lighting -- watch --focus`;
- [x] `DeviceAdapter` layer: the lighting protocol is confirmed on hardware and
  `node scripts/lighting.mjs watch` pushes the state colours — see
  [`hid-lighting-protocol.md`](research/hid-lighting-protocol.md);
- [x] navigating to a session hosted by Claude Desktop:
  `claude://resume?session=<uuid>` opens it by id. The route is not documented
  and the handler reports nothing back, so a session whose transcript has left
  the disk fails silently.

Both historical blockers are now lifted. The per-key LED protocol is confirmed
on hardware and implemented — including on the `Claude` layer, provided its six
Agent positions carry the `KV_OAI_AG00` to `KV_OAI_AG05` keycodes, which
[`scripts/enable-agent-keys.mjs`](../scripts/enable-agent-keys.mjs) sets. What
keeps this track out of V1 is now its dependency on an undocumented route and on
quitting the ChatGPT app, not an unsolved problem. Measurements and bounds in
[`docs/research/thread-status-feasibility.md`](research/thread-status-feasibility.md)
and [`docs/research/hid-lighting-protocol.md`](research/hid-lighting-protocol.md).
