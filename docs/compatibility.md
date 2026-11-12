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

## Re-run on 12 November 2026

A second machine, set up from nothing. The rows above are left as measured; these
are what the same checks give on current versions.

| Item | Version / target | Level of proof | Result |
| --- | --- | --- | --- |
| Firmware | `0.6.3` (`sys.version`) | hardware, read by eye | per-key lighting renders with short and long field names; slot mapping unchanged; Input reports no firmware update needed |
| Work Louder Input | `1.1.0`, bundle `it.focusense.input-app` | real export → repository generator → official import → official re-export | native-layer SHA-256 identical; AppSense link and logical mapping preserved; this exact version is now supported |
| Device keymap | read by Input `1.1.0` | hardware | profiles written from `0.17.3` are intact, including the `KV_OAI_AG00`–`AG05` keycodes on the Claude layer |
| macOS | `27.2` arm64 | local observation | HID vendor interface opens non-exclusively from a shell, with Input and the ChatGPT app running |
| Claude Code | `2.1.322` | two recorded sessions, replayed in tests | roster `status` (`busy` / `idle` / `waiting`) used for session state; see [`thread-status-feasibility.md`](research/thread-status-feasibility.md) |
| Claude Desktop | `5.1231.2` | local bundle | shortcuts of the Claude layer not re-tested on this version |
| launchd agents | `scripts/service.mjs` | installed and running; lighting `KeepAlive` restart exercised | correlated HID lighting writes succeed after launchd startup and restart; this does not validate physical key presses or the Claude layer |

### Acceptance follow-up, same day

At the start of this follow-up the connected keyboard contained only `Default`,
with one native layer. `Claude AppSense B` was recreated from a copy of it and a
new Claude-linked layer. Its real export went through the generator and Agent
key transform, was imported as `Claude macOS`, and was officially exported again.
The native layer's complete object and SHA-256 are identical before generation
and after re-export:
`07eaffb11c3bb91ffe3f3f12aff90a6564c14410d2b5b61bfac21b7d64085493`.
The AppSense reference, shortcuts, Effort macros, joystick and six Agent codes
survive Input's action-id remapping. Sanitised real fixtures are kept in
[`tests/fixtures/input-1.1.0`](../tests/fixtures/input-1.1.0).

`Claude macOS` is active. The complete `Default` profile is unchanged in Input's
local keymap comparison. The preparation profile remains as a recovery copy.

AppSense activation is not validated: after an automated attempt to foreground
Claude, `device.status` still reported the native layer. A pilot using another
AppSense reference was not imported; the final profile keeps the reference
preserved by the round-trip. This remains an open checklist item.

The user-scoped plugin was installed from this local marketplace. A fresh
interactive run without `--plugin-dir` emitted 26 hooks: 12 prompts, 11 Stops,
SessionStart, idle notification and SessionEnd. Its 676 roster samples give 27
state changes with no disagreement when replayed through the current reducer.
One initially listed sample had no `status`; 657 samples had explicit idle/busy
status and 18 showed the session absent. This is recorded CLI/reducer evidence,
not a visual LED or physical shortcut test. The new run had automatic approval;
permission waits remain covered by the earlier dedicated recording.

The section 10 hardware checklist remains open at the owner's request; the
[physical test procedure](hardware-validation.md) is ready. A standalone
`*-layer.json` round-trip and publication remain pending. Profile compatibility
with `1.1.0` does not promote the preset beyond `hardware-observed`.

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
