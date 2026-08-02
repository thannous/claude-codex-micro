[English](hid-lighting-protocol.md) · [Français](../fr/research/hid-lighting-protocol.md)

# Codex Micro HID lighting protocol — observed format, confirmed at runtime

## Verdict

**The per-key lighting channel is open.** The reported framing is confirmed at
runtime, the non-exclusive transport works with `node-hid` 3.4.0, and an original
reimplementation ships with the repository (`scripts/lib/hid-frame.mjs`,
`scripts/lib/hid-lighting.mjs`, `scripts/lib/hid-device.mjs`,
`scripts/lighting.mjs`). Anyone can drive the colour and effect of their own
keyboard's keys, plus the two global zones, and listen to key and joystick
events.

Measurements on macOS `26.5.2` arm64, Codex Micro firmware `v0.4.1` (read
through `sys.version`), `node-hid` `3.4.0`.

**Re-verified on firmware `v0.6.1`**, 2 August 2026, after a vendor update. The
framing, the RPC channel and `v.oai.thstatus` survive two minor versions
unchanged. The notification surface was measured in full on that occasion; the
results are in the section below.

## Legal framing, restated

This document describes an **observed format**: constants, byte positions, JSON
fields. The repository's implementation is original code written from those
facts, to interoperate with a device its user owns. Not a line of the Work Louder
SDK (`UNLICENSED`, private registry) is reused or redistributed; the extracts
read locally to establish the facts stay under `.local/`, which Git ignores.

## Evidence matrix

| Claim | State | Proof |
| --- | --- | --- |
| 64-byte reports, byte 0 = `0x06`, byte 1 = channel `2` (RPC), byte 2 = length, UTF-8 payload from byte 3 | **confirmed** | `sys.version` round-trip → `{"result":{"version":"v0.4.1"},"id":798,"method":"sys.version"}` |
| 61-byte payload per report, multi-report continuation beyond that | **confirmed** | `thstatus` pushes of ~140 bytes (3 reports) acknowledged six times during the probe |
| Byte 2 carries the length **of the chunk**, on every report | confirmed | consistent with per-channel accumulation on the host side; the "total length in the first report" hypothesis (parallel Swift probe) is ruled out |
| Channel 1 = debug logs, channel 2 = RPC, messages terminated by a newline | confirmed | format read + working reception |
| Request envelope `{method, params, id}`, integer `id` in `[0, 999)`, non-ASCII escaped as `\uXXXX` | confirmed | successful round-trips |
| Response `{result, id, method}` or `{error, id}`; the method is echoed back | confirmed | responses observed |
| Notification without `id`: `{method, params}`, compact forms `m`/`p`, `i` possible | confirmed | format documented, dispatch implemented |
| VID `0x303a`, PID `0x8360`, vendor collection usage page `0xFF00` | confirmed | `hidutil list`, `node-hid` enumeration |
| **Non-exclusive** open possible with `node-hid` 3.4.0 (`HIDAsync.open(path, { nonExclusive: true })`) | **confirmed** | open + round-trip succeeded while ChatGPT held the same device |
| `v.oai.thstatus` drives each Agent key: entries `{id, c, b, e, s, sk, sa}`, omitted fields unchanged | **confirmed** | six writes acknowledged, keys lit one by one, clean turn-off |
| `v.oai.rgbcfg` configures two global zones `{ambient, keys}` × `{e, b, s, m, c}` | confirmed (format) | format read; not exercised for writing here |
| Effects: `off=0, solid=1, snake=2, rainbow=3, breath=4, gradient=5, shallowBreath=6` | confirmed (format) | documented enumeration |
| Notifications `v.oai.hid` `{k, act, ag}` (keys) and `v.oai.rad` `{a, d}` (joystick) | confirmed (format) | types documented; listening implemented (`listen`) |
| Thread id ↔ physical key mapping: `[0..5]` in the order `key-9, key-10, key-5…key-8` | **confirmed on hardware** | one-key-at-a-time probe: ids 0 to 5 follow the order of `SLOT_CONTROLS`, top row then the next, left to right |
| One request in flight, 50ms between calls, a 10s guard per response | honoured | behaviour of the shipped transport |

## The transport point, and the mistake not to repeat

`node-hid` bundles hidapi, which opens **exclusively by default** since hidapi
0.14. Opening with `new HID.HID(path)` and no option fails on this device while
another application holds it — that is the failure measured by the parallel probe
(`scripts/lighting-probe.mjs`), which wrongly concluded that `node-hid` could not
open this device.

`node-hid` does expose the option, though:
`HIDAsync.open(path, { nonExclusive: true })` calls
`hid_darwin_set_open_exclusive(0)` (`node_modules/node-hid/src/HIDAsync.cc:137`),
and the non-exclusive open **works** — proven by the `sys.version` round-trip.
The IOKit non-exclusive open (`kIOHIDOptionsTypeNone`), which the parallel Swift
probe validated, amounts to the same thing.

Practical consequence: the Node transport is enough, no helper binary needed. The
macOS "Input Monitoring" permission was not required for the non-exclusive open
on this machine.

## Write contention, shipped strategy

The device is opened non-exclusively by every application: reads are broadcast to
all, writes compete, **last write wins**. The ChatGPT app pushes `rgbcfg` then
`thstatus` again every 35 to 40 seconds.

The coexistence signal is free: responses echo the method, and a response whose
id is not ours necessarily belongs to another writer (these are the "orphan
responses" that Input logs as warnings). The `--hold` mode of
`scripts/lighting.mjs` builds on that: any detected foreign push triggers an
immediate reapply, with a periodic 10s safety net. Without `--hold`, the state
set here is overwritten at ChatGPT's cadence — expected behaviour, and shown to
the user.

## Shipped components

| Component | Role |
| --- | --- |
| `scripts/lib/hid-frame.mjs` | pure framing: fragmentation, per-channel reassembly, JSON-RPC accumulator (pure, tested) |
| `scripts/lib/hid-lighting.mjs` | `thstatus`/`rgbcfg` parameters, state palette → six entries (pure, tested) |
| `scripts/lib/hid-device.mjs` | `node-hid` transport: discovery, non-exclusive open, paced queue, correlation by id, foreign-write detection |
| `scripts/lighting.mjs` | `list` / `probe` / `set` / `watch` / `listen` / `off` CLI, `--hold` option |
| `tests/hid-frame.test.mjs`, `tests/hid-lighting.test.mjs` | 21 tests without hardware |

`watch` is the `DeviceAdapter` the roadmap called for: it follows
`~/.claude/thread-status/slots.json` and pushes the state colours of the six
slots on every change.

## Device-side observations, from an independent shim

Everything above was measured host-side: we write to the keyboard. A separate
MIT project, `maxxspotter/codex-micro-app`, does the opposite. Its
`apps/micro-shim/` patches `node-hid` inside the Codex desktop process to
advertise a synthetic Codex Micro, so it observes the traffic Codex sends *to*
the device. Its framing matches this document exactly — report `0x06`, channel
`2`, 61-byte chunks, same descriptor — which is independent corroboration of the
matrix above.

It added four facts about **values**, where this document previously described
only field names. Three of the four have since been **measured here** on
firmware `v0.6.1` (capture of 2 August 2026, `scripts/lighting.mjs listen`,
every control actuated by hand). The fourth cannot be reached from the host
side.

| Fact | Shim's claim | Measured here |
| --- | --- | --- |
| Action keycodes on `v.oai.hid` `k` | `ACT06` fast, `ACT07` approve, `ACT08` reject, `ACT09` split, `ACT10` mic, `ACT12` send; `ACT11` unexplained | **confirmed, plus the explanation of `ACT11`** — see below |
| Joystick encoding of `v.oai.rad` | `a` normalised over `[0, 1]`: right `0`, down `0.25`, left `0.5`, up `0.75`; `d` a distance over `[0, 1]` | **confirmed**: `0.0107`, `0.2388`, `0.4894`, `0.7614` at `d = 1`. One divergence on release, below |
| Encoder events | `{k, act: 2}` for a rotation notch, `ENC_CLK` for the click, CW/CC swapped relative to the physical direction | **confirmed**: `act: 2` on rotation with no release event, `ENC_CLK` in `1`/`0`; the swap matches [`effort-wheel-calibration.md`](effort-wheel-calibration.md) |
| Codex queries the device | `sys.version`, and `device.status` returning `{version, profile_index, layer_index, battery, is_charging}` | **not verified**: unreachable from the host side, where we never see what Codex sends to the device |

### `ACT11` is not a key

A single press of the wide bottom key emits **two keycodes**, `ACT11` then
`ACT10`, three times out of three:

```
23:14:14.245 ACT11 act1   +5ms ACT10 act1   … ACT10 act0  +3ms ACT11 act0
23:14:18.502 ACT11 act1   +6ms ACT10 act1   … ACT10 act0  +4ms ACT11 act0
23:14:21.334 ACT11 act1   +6ms ACT10 act1   … ACT10 act0  +6ms ACT11 act0
```

The order is invariant, the nesting is 3 to 6 ms, and the hold durations (163,
203, 213 ms) match every other key in the same capture. This is one physical
actuator occupying **two matrix positions**, not two keys. Hence the shim's
apparent gap: `ACT11` has no actuator of its own to expose.

Counting follows from that: **13 keycodes for 12 key actuators**, plus the wheel
press — which is how the 13 switches announced in the README are made up, by a
different composition than the 13 keycodes.

### Two divergences from the shim

- **Joystick release.** The device sends `{a: 0, d: 0}`, resetting the angle.
  The shim repeats the last angle with `d: 0`. A consumer reading the angle on
  release would see "right" on real hardware.
- **No `ag` field.** The Agent keys emit `{k, act}` only. The shim sends an `ag`
  index alongside agent taps, and the matrix above lists `{k, act, ag}` — `ag`
  was never observed in this capture.

### Caution on the shim's labels

The shim only observes, so its field labels are inferences rather than
measurements: it reads a thread entry as `{id, color: c, enabled: e, effect: m}`,
whereas `e` is the effect enumeration confirmed on hardware here and `m` appears
in zone descriptions, not in thread entries. Where the two disagree, this
document is the measured one. And the `device.status` payload is what the shim
*claims* to be, not what a real Micro reports — `profile_index` and
`layer_index` remain a lead worth probing for the layer work in the roadmap.

## What is still open

- The exact semantics of `sk` / `sa` (syncing a thread's colour towards the key
  or ambient zones, in either direction): not exercised, left at 0 by default.
- `v.oai.rgbcfg` for writing: format confirmed, never sent here. The method
  describes both zones at once, so the CLI requires `--keys` and `--ambient`
  together.
- Whether thread ids beyond 5 exist (other keys): no clue, not explored.
- **Dropped encoder notches.** In the `v0.6.1` capture, five deliberate slow
  notches (1.7 to 2.3 s apart) produced only four events, while a fast burst in
  the other direction produced five, two of them 99 ms apart. An earlier capture
  lost one notch out of four. Loss is therefore **not** explained by rotation
  speed, which is the reassuring half; the unexplained half is why a slow,
  isolated notch goes missing at all. Worth a counted, instrumented run before
  trusting a notch-per-notch effort mapping.
- The direction of rotation in that capture rests on the operator's intent, not
  on an independent signal: the two rotation phases were both meant to be
  clockwise and emitted opposite keycodes. The `clockwise → ENC_CC` reading
  therefore still stands on the hardware measurement recorded in
  [`effort-wheel-calibration.md`](effort-wheel-calibration.md), which this
  capture is consistent with but does not by itself re-prove.
- The real `device.status` payload of a Micro, and `profile_index` /
  `layer_index` in particular: unreachable from the host side, would need a
  device-side vantage point.
- Longevity: this is the format of firmware `v0.4.1`; an update may change it
  without notice.

## Sources

- Format and enumerations: read locally in the ChatGPT.app bundle
  (`@worklouder/device-kit-oai`, `@worklouder/wl-device-kit`) — read for
  documentation, no redistribution.
- Runtime measurements: this machine, July 2026 (round-trip, probe, `watch`
  chain on synthetic state).
- [`thread-status-feasibility.md`](thread-status-feasibility.md) — upstream
  measurements (roster, hooks, contention, orphan responses in Input's log).
- [`appsense-behavior.md`](appsense-behavior.md) — contention and zones.
- [`maxxspotter/codex-micro-app`](https://github.com/maxxspotter/codex-micro-app)
  (MIT), `apps/micro-shim/` — the device-side observations above. Its `node-hid`
  interception layer is itself adapted from Marcel Pociot's MIT-licensed
  [Codex Micro Stream Deck emulator](https://github.com/mpociot/codex-micro-stream-deck-emulator).
  Read for documentation; no code from either project is reused here.
