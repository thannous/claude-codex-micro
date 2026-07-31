[English](compatibility.md) · [Français](fr/compatibility.md)

# Compatibility matrix

This matrix separates the observed environment, the analysis of the sharing
mechanism, and the validations still required on hardware.

| Item | Version / target | Level of proof | Result |
| --- | --- | --- | --- |
| Hardware | Work Louder Codex Micro | `hardware-observed` | clickable wheel at the upper left, non-clickable joystick at the upper right and the main keys observed; full checklist pending |
| Work Louder Input | `0.17.3`, bundle `it.focusense.input-app` | real profile and generator validated | local profile transformation validated; separate layer round-trip pending |
| Historical mechanism | Input `0.17.2` | official bundle inspected | layer and profile import/export observed statically |
| Firmware | `v0.4.1` | Setup screen observed locally | Input/firmware combination known; hardware validation partial |
| macOS | `26.5.2` arm64 | local observation | application and HID observed |
| Claude Desktop | `1.24012.9`, bundle `com.anthropic.claudefordesktop` | local bundle and generated profile | `⌘N`, `⌘D`, `⌘⇧D` configured; `Esc` still to be validated in context |
| AppSense | existing link of the Claude layer | real export and hardware behaviour observed | `linkedAppId` preserved locally and forbidden in public artefacts; focus loss measured: an unlinked application does not return to the native layer |
| CLI backup | Node.js `>=18` | automated tests | copy, SHA-256 manifest and restore tested on an isolated copy |
| Layer artefact | `*-layer.json` | absent | must come from a real, sanitised export and go through a round-trip |

## Reading the levels

- `proposal-not-applied`: logical files and tools available, no real layer
  claimed;
- `hardware-observed`: hardware environment inventoried;
- `manually-validated`: mapping and AppSense tested control by control;
- `export-format-verified`: export, isolated import, duplicate and rollback
  reproduced.

The Claude preset is `hardware-observed`. It will only move to
`manually-validated` after the full checklist covering the keys, the wheel, the
joystick, restart and rollback. The unsafe focus-loss behaviour is already
measured; its absence from that list is not a claim that AppSense is safe.
