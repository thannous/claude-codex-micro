[English](configuration.md) · [Français](../fr/codex-micro/configuration.md)

# Configuring the Codex Micro for Claude Desktop

## Target flow

1. export the active Input profile and create a verified backup;
2. inventory the layers without publishing private data;
3. fully protect the native layer at index `0`;
4. require exactly one existing `Claude` layer, outside index `0`;
5. preserve its AppSense link in a local copy of the profile;
6. apply the documented physical mapping to that copy;
7. test every control, focus loss and a restart;
8. export the layer, sanitise it and verify its round-trip;
9. restore the original profile on any discrepancy.

This integration uses HID shortcuts and AppSense. It does not depend on the
experimental Hardware Buddy protocol.

The V1 manifest and mapping describe the observed state of the generator. The
logical file `macos.example.json` stays `proposal-not-applied` and must not be
imported as is. `npm run configure` only builds a personal profile from the
user's own official export.

## Mandatory preservation

The preset and the tool enforce the following rules:

- index `0` protected, with no replacement and no modification;
- `exactly-one-existing-named-layer` policy;
- six slots at most;
- no other profile, layer or AppSense link modified;
- a missing or duplicated `Claude` refused;
- an unknown export structure refused rather than interpreted;
- backup and SHA-256 verification before the real session;
- no direct write into Input's storage;
- no configuration write to the device — keymap, layers and layer colours go
  exclusively through the Input profile flow.

The last rule used to cover every write to the device. It is now restricted to
**persistent** writes: sending volatile HID lighting reports is within scope, under
six cumulative conditions set out in
[`docs/scope-and-limitations.md`](../scope-and-limitations.md). This particular
configuration does not depend on that, and remains achievable without writing to
the device even once.

The inventory blocks the transformation if the official export does not make it
possible to prove the presence of the protected layer at index `0` and of a
single `Claude` layer.

## V1 physical mapping

Orientation: seen from above, cable pointing away from the user.

| Control | Position | Action |
| --- | --- | --- |
| Key 1 | row of four square keys, far left | `⌘N` — new conversation |
| Key 2 | same row, second | `⌘D` — voice mode |
| Key 3 | same row, third | `⌘⇧D` — show or hide the diff |
| Key 4 | same row, far right | `Esc` — cancel or close, depending on context |
| Clickable wheel | upper left corner | Claude Effort, clockwise: `+1`; counterclockwise: `−1`; press configurable |
| Non-clickable joystick | upper right corner | up, right, down and left arrows |

![Physical mapping diagram](../../profiles/claude-shortcuts/assets/layout.svg)

The internal `inputControlId` identifiers stay `null` until they are read in
Input on the exact Codex Micro. The positions above are therefore a readable
physical target, not a claim about the application's internal schema.

## Appearance

- layer name: `Claude`;
- proposed colour: `#D97757`;
- other controls: `no-action`;
- touch sensor: reserved for layer switching;
- dial press: no action.

## AppSense

The link targets only:

```text
Claude
com.anthropic.claudefordesktop
```

The link must exist before the profile is exported. The generator preserves its
`linkedAppId` in the local copy, refuses its absence, and never creates a second
link. Other links are never modified.

**There is no automatic return to a safe state after focus loss.** Measured on
hardware: AppSense is only a set of application → layer rules, and every rule is
a one-way transition. Leaving Claude for an unlinked application leaves the board
on the Claude layer, indefinitely. The Claude layer must therefore be designed as
if its shortcuts could stay active elsewhere. See
[`docs/research/appsense-behavior.md`](../research/appsense-behavior.md).

## Actions absent by default

- Return/Enter and sending a message;
- approving, refusing or rejecting a permission;
- deletion;
- `git push`;
- deployment;
- terminal, shell or destructive commands;
- the Quick Entry and Dictation global shortcuts.

Global shortcuts are deliberately outside the AppSense layer: they have to stay
usable when another application is in the foreground. On the documented setup,
those are the double press on Option for quick entry, and Caps Lock for global
dictation.

## Official sharing, as observed

Input `0.17.2` contains the **Export layer**, **Import layer**, **Export
Profile** and **Import Profile** flows. A layer export carries the
`*-layer.json` suffix and contains the envelope described in
[`docs/research/input-0.17.2-sharing.md`](../research/input-0.17.2-sharing.md).

The repository does not fabricate the internal `layer`, `actions` and group
objects. The future artefact must come from a real Codex Micro export, be
sanitised, then re-imported into an isolated configuration.

## Validation still outstanding

- [ ] real profile export and readable inventory;
- [ ] positions and physical identifiers verified in Input;
- [x] local transformation of the existing layer without modifying index `0`;
- [x] AppSense link preserved in the generated profile;
- [ ] four keys, dial and joystick tested;
- [ ] unused controls confirmed as no-action;
- [x] behaviour after focus loss: established, there is no return;
- [ ] persistence after a restart;
- [ ] layer export/import reproduced on an isolated copy;
- [ ] duplicate refused or handled idempotently;
- [ ] original profile re-imported and device verified.

## Sources

- [Work Louder — Codex Micro, layers and AppSense](https://worklouder.cc/openai-micro-setup)
- [Claude — quick entry on macOS](https://support.claude.com/en/articles/12626668-use-quick-entry-with-claude-desktop-on-mac)
