[English](effort-wheel-calibration.md) · [Français](../fr/research/effort-wheel-calibration.md)

# Claude Effort wheel — macro calibration

## Verdict

The Effort mode macro carries two delays, for roughly **90ms per notch**: `80ms`
on the ⌘ release and `10ms` on `Esc`. The arrow step deliberately stays at `0`.

The first version of this macro cost 900ms per notch. The factor of ten does not
come from trying more values, but from changing the **shape** of the macro so
that each measurement became interpretable.

## Why `Esc` is mandatory

`⌘⇧E` is a **toggle**, verified on Claude Desktop: sending it twice in a row
opens then closes the picker.

Every notch therefore has to close the picker itself. Without the final `Esc`,
the next notch would close the picker instead of opening it, and the level would
be skipped. That is also the most likely cause of levels lost during a fast
sweep: two overlapping macros desynchronise the toggle.

## Why the shape is asymmetric

Input does not document whether a step's `delay` field applies **before** or
**after** that step, and no source settles it: the application never executes the
macros, it writes `keymap.json` to the board's flash and the firmware alone
interprets the field.

As long as the wait was split across two steps, the two readings gave the picker
different durations, and every attempt was therefore measuring something other
than what you thought you were tuning. Putting all the wait on the ⌘ release and
`0` on the arrow makes both readings equivalent:

| reading | sequence | wait the picker receives |
| --- | --- | --- |
| "after" | ⌘ released, wait, arrow | the constant |
| "before" | wait, ⌘ released, arrow | the constant |

The opening delay then becomes exactly equal to the constant. Do not split this
wait across both steps: that doubles the delay and guarantees nothing more. The
total cost of a notch also includes the `10ms` of visual feedback carried by
`Esc`.

## Calibration measured on hardware

Scale tested on the Codex Micro, one value per key, all on "effort +1" so that
direction is not a variable:

| opening wait | result |
| --- | --- |
| 120ms | changes the level |
| 80ms | changes the level |
| 60ms | changes the level |
| 40ms | changes the level |
| 20ms | fails |
| 0ms | fails |

The floor is therefore between 20 and 40ms. The value chosen, `80ms`, doubles the
measured floor.

`40ms` was tried in real use and judged less reliable than in isolated testing.
That is consistent: the floor was measured on an already-warm picker, whereas the
real mount time depends on the renderer's load. **A floor is not a production
value.** Below roughly 100ms the difference in latency is not perceptible,
whereas a lost level is noticed immediately: the right target is the smallest
value that never misses, not the smallest one that works.

Failure below the floor is quiet. The arrow leaves before the picker has focus,
and the change is lost with no error message. Any reduction must therefore be
validated over several repetitions **and** on a cold first open, coming back from
another application.

## Why `Esc` carries 10ms

Without a wait on that step, the arrow and `Esc` are emitted with no gap and
Claude handles them in the same loop turn: the picker opens and closes without
ever painting a frame showing the slider at its new level. The level does change,
but **blind** — the visible effect is only a flicker.

`10ms` is enough to let one frame through, and the level reached becomes
readable. This wait is paid **after** the level has changed: it lengthens the
macro without delaying its effect.

Methodological consequence: the 300ms the first version of the macro carried at
that spot were not dead time. They had been removed on the sole criterion of
latency, which lost the visual feedback without the chosen criterion being able
to detect it.

## Direction of rotation

The encoder cell at index `0` is **physically clockwise**, confirmed on hardware.
That is the opposite of what the factory template's names suggest, since it names
the three cells `KV_OAI_ENC_CC`, `KV_OAI_ENC_CW`, `KV_OAI_ENC_CLK`.

Two inversions stack, which makes the mistake easy:

- the firmware delivers the two rotation events swapped relative to the vendor's
  cell names;
- Input 0.17.3 additionally swaps the `CW` and `CCW` labels in its editor for any
  three-cell encoder, so its interface contradicts the keycode names of its own
  default template.

The generator writes the JSON directly and therefore bypasses the second point.
Do not align `PHYSICAL_ENCODER_SLOTS` with what the editor displays, nor with the
keycode names: that inverts the wheel.

## Why grouping notches was ruled out

Making a single `⌘⇧E` / `Esc` cycle cover N notches requires three things: a
persistent counter, a non-blocking delay, and the ability to emit keystrokes.

The embedded MicroPython SDK provides the first two — a notch counter through
`EVENT.ENCODER`, and an approximate delay through the frame hook — but **no
keystroke-emitting API**. That SDK is moreover not available on the Codex Micro:
it is reserved for the Nomad [E] v1, and Input shows no Widgets tab for this
model. The `keymap.json` format offers no alternative: no counter, no condition,
no toggle, the only state the firmware retains being the active layer and
profile.

Grouping therefore requires an agent on the host. At 900ms per notch it was amply
justified; at 90ms, five notches cost 450ms against roughly 300ms for an agent
that groups them, and the gap no longer pays for a daemon or an accessibility
permission.

## What is still unproven

- **The semantics of `delay`.** The behaviour observed on the `Esc` step suggests
  it applies before its step, since under the "after" reading these 10ms would be
  dead time at the end of the macro and would change nothing on screen. That is
  not a proof. Decisive test: put `500ms` on the `Esc` step. If the picker stays
  visibly displayed for half a second, it is "before"; if it closes immediately
  and it is the wheel that stays inert, it is "after".
- **What happens to encoder events while a macro runs**: queued or lost. The
  firmware is not QMK — it is an ESP32-S3 under FreeRTOS with in-house firmware —
  so the hypothesis of a scan loop frozen during the wait is unfounded.
- **The maximum delay the firmware accepts.** Input's interface caps the input at
  9999ms, but nothing bounds the value on import: a hand-written JSON passes
  whatever it likes.
