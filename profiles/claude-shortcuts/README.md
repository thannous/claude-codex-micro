[English](README.md) · [Français](README.fr.md)

# Claude Desktop — Codex Micro V1

This folder contains the library's first reference preset. It locally transforms
a profile containing exactly one `Claude` layer, already linked with AppSense and
distinct from the native Codex layer protected at index `0`.

## Real state

- community format and mapping: implemented;
- profile generator: validated on an Input `0.17.3` export;
- official Input `*-layer.json` mechanism: observed historically in Input
  `0.17.2`;
- backup, inventory, dry run and rollback: implemented and tested on isolated
  copies;
- official Claude `*-layer.json` file: **not captured yet**;
- full validation of every command, of focus loss and of the hardware rollback:
  **still required**.

The V1 manifest stays `hardware-observed`. The logical contract
`macos.example.json` stays separately `proposal-not-applied`. Neither may be
presented as a universal, ready-to-import file, and no layer artefact may be
published before the hardware round-trip and the verification of its SHA-256.

## Files

```text
manifest.json             identity, compatibility, proof and installation
mapping.json              physical mapping and safety rules
macos.example.json        non-importable V0 logical proposal
schema.json               schema of the historical contract
assets/layout.svg         original representation of the keyboard
artifacts/README.md       entry point for the future official export
```

The reusable schemas live in `profiles/schema/v1/`.

## Proposed physical mapping

Orientation: seen from above, cable pointing away from the user.

| Control | Position | Action |
| --- | --- | --- |
| Key 1 | row of four square keys, far left | `⌘N` — new conversation |
| Key 2 | same row, second | `⌘D` — voice mode |
| Key 3 | same row, third | `⌘⇧D` — show/hide the diff |
| Key 4 | same row, far right | `Esc` — cancel/close, depending on context |
| Clickable wheel | upper left corner | Claude Effort, clockwise: `+1`; counterclockwise: `−1`; press configurable |
| Non-clickable joystick | upper right corner | four directional arrows |

![Claude layer diagram](assets/layout.svg)

By default this V1 preset leaves the six Agent keys, the wide bottom key, the
lower-right key and the dial press without an action. Those controls stay
configurable in the GUI; only the touch sensor is reserved for layer switching.

## AppSense

The link targets only:

```text
Claude
com.anthropic.claudefordesktop
```

The policy requires exactly one Claude layer and preserves its `linkedAppId`. The
tool does not create a second link and never modifies the others.

## Local configurator

```sh
npm run configure
```

The GUI loads an official export belonging to the user, lets you customise the
safe controls, and generates a new `Claude-macOS-profile.json`. Only that
personal file is meant for Input's **Add New** flow; the repository's logical
contract is not.

The GUI catalogue also offers two sending actions on an explicit choice: Return
to send, and `⌥⌘Return` to send in a duplicated session. Enter stays unavailable
in the custom combination editor, and these actions are not part of the public
preset by default.

Wheel rotation carries the **Claude Effort** mode by default: each notch opens
the picker with `⌘⇧E`, moves its slider one level with `←` or `→`, then closes it
with `Esc`, without using `Enter`. The GUI lets you set it back to scrolling,
line-by-line scrolling, volume, or unassign it. Since `⌘⇧E` is a toggle, that
`Esc` is mandatory. The macro waits 80ms for the picker to appear, then 10ms for
it to show the level reached before closing — roughly 90ms per notch, paid in the
firmware.

The double press on Option for quick entry, and Caps Lock for global dictation,
stay outside the AppSense layer.

## Safety

The validator of the public logical preset forbids, on active controls:
Return/Enter, sending, approving or refusing a permission, deletion, `git push`,
deployment and destructive commands. The personal GUI's two sending actions
therefore remain an explicit local choice.

To validate the preset:

```sh
npm ci --no-audit --no-fund
node scripts/validate-profile.mjs
node scripts/validate-presets.mjs
node --test
```

Then read [`docs/installation.md`](../../docs/installation.md).
