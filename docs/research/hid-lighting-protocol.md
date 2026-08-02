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

Four facts it adds. All are **read from that project's source, not verified
here**; they describe values, where this document so far only described field
names.

| Fact | Detail |
| --- | --- |
| Action key names carried by `v.oai.hid` `k` | `ACT06` fast, `ACT07` approve, `ACT08` reject, `ACT09` split, `ACT10` mic, `ACT12` send. `ACT11` is unaccounted for. Agent keys are `AG00`–`AG05`, as measured here. |
| Joystick encoding of `v.oai.rad` | `a` is normalised over `[0, 1]`: right = `0`, down = `0.25`, left = `0.5`, up = `0.75`. `d` is a distance over `[0, 1]`; a release repeats the angle with `d: 0`, after 80 ms in the shim. |
| Encoder events | `{k: "ENC_CW" \| "ENC_CC", act: 2}` — `act` 2 marks a rotation notch, distinct from the `1`/`0` press/release of keys. The click is `ENC_CLK`. The shim swaps CW and CC deliberately, on the grounds that Codex names the directions as seen from the underside of the case. |
| Codex queries the device | `sys.version`, and `device.status` expecting `{version, profile_index, layer_index, battery, is_charging}`. The shim answers every request it does not understand with `true`, stating that Codex's RPC queue is serialised and stalls on an unanswered id. |

Two cautions. The shim only observes, so its field labels are inferences rather
than measurements: it reads a thread entry as `{id, color: c, enabled: e,
effect: m}`, whereas `e` is the effect enumeration confirmed on hardware here
and `m` appears in zone descriptions, not in thread entries. Where the two
disagree, this document is the measured one. And the `device.status` payload is
what the shim *claims* to be, not what a real Micro reports — `profile_index`
and `layer_index` are a lead worth probing for the layer work in the roadmap,
not a measurement.

## What is still open

- The exact semantics of `sk` / `sa` (syncing a thread's colour towards the key
  or ambient zones, in either direction): not exercised, left at 0 by default.
- `v.oai.rgbcfg` for writing: format confirmed, never sent here. The method
  describes both zones at once, so the CLI requires `--keys` and `--ambient`
  together.
- Whether thread ids beyond 5 exist (other keys): no clue, not explored.
- The four device-side facts above: read from a third-party source, never
  reproduced here. `ACT11`, the real `device.status` payload of a Micro, and the
  physical direction of `ENC_CW` are the three worth measuring first.
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
