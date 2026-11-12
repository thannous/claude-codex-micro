[English](hardware-validation.md) · [Français](fr/hardware-validation.md)

# Test the Claude profile on the keyboard

**12 November 2026: no physical control has been validated in this follow-up.**
This procedure supplements [installation section 10](installation.md#10-hardware-validation).
Check an item only after using the Codex Micro itself and recording the Claude
version and observed result. A shortcut sent from the Mac does not validate a
physical key.

## Prepare

1. In Input, verify that the imported Claude profile appears with a native layer
   at index 0 and exactly one `Claude` layer at index 1. The test is not ready
   until the generated profile has actually been imported.
2. Keep `Default` and the source export. Open a disposable Claude conversation
   without important data or production commands.
3. Isolate Agent key tests from ChatGPT, which can react to the same presses.
   Keep Input open so the active layer can be observed.
4. Record Input, firmware, macOS, Claude Desktop and the exact profile name.

## Exercise each control

| Done | Physical action | Expected result |
| --- | --- | --- |
| [ ] | Bring Claude to the foreground | the `Claude` layer activates; the native layer remains separate |
| [ ] | Press K1 once | `⌘N` opens a new conversation |
| [ ] | Press K2 once | `⌘D` activates voice mode; finish without transmitting private content |
| [ ] | Press K3 where a diff exists | `⌘⇧D` shows or hides the diff |
| [ ] | Press K4 with a menu open, then during a test turn | `Esc` closes the menu or interrupts only the intended turn |
| [ ] | Rotate one notch in each direction | effort changes by exactly one level in the expected direction, the new level is visible, and the picker closes without sending a prompt |
| [ ] | Return from Finder, then rotate one notch | the first notch also changes the effort level and shows it before closing |
| [ ] | Move the joystick in four directions | all four arrows work in a disposable navigation context |
| [ ] | Check unused controls and the wheel click | no send, deletion or permission approval action appears |
| [ ] | Switch to Finder and back to Claude | Finder may leave the Claude layer active; returning to Claude reactivates it; actions remain safe outside Claude |
| [ ] | Quit and relaunch Input | profile, mapping and AppSense link persist |
| [ ] | Switch to `Default` and back | the original profile remains available and no other existing profile or link has changed |

Check wheel direction on the hardware rather than trusting Input's CW/CCW
labels. If scrolling replaces Effort mode, also check clockwise down and
counterclockwise up. Do not test Enter, permissions, deletion, push or deployment.

For Agent keys, separately record the colour actually visible and the session
actually opened. CLI transitions and HID acknowledgements do not replace that
observation.

## If a result differs

Select and activate `Default` in Input. Retain the test profile and exports for
diagnosis; do not reset the keyboard. Record the control, foreground app,
initial state, expected effect and actual effect. Leave the item unchecked until
it has been retested.

The preset remains `hardware-observed` until the complete hardware checklist
passes. JSON round-trips, automated checks and login services are separate evidence.
