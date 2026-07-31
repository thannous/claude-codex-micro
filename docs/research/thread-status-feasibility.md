[English](thread-status-feasibility.md) · [Français](../fr/research/thread-status-feasibility.md)

# Claude Code session states and Agent keys — measurements

## Verdict

**The states are available officially, the LEDs work on the `Claude` layer, and
navigation is verified in Claude Desktop; terminal focus is implemented but not
yet tested end to end.** Three conclusions, in decreasing order of solidity:

1. Detecting "running / needs you / done / closed" per session is a solved
   problem, with two documented and complementary mechanisms.
2. Going to a session from a key is verified through
   `claude://resume?session=<uuid>` when Claude Desktop hosts it. The route is
   not documented. Terminal window focus over AppleScript is implemented and
   compiles, but still lacks an end-to-end test with a live terminal session.
3. Driving the six LEDs **works, including on the `Claude` layer**, on one
   condition discovered late: the six Agent positions of that layer must carry
   the `KV_OAI_AG00` to `KV_OAI_AG05` keycodes. The firmware's predicate is the
   keycode, not the layer index.

All three building blocks are implemented, with terminal focus still awaiting
end-to-end validation, and no Claude shortcut is sacrificed. But the feature
has a condition of use: **the ChatGPT app must be quit.** It rewrites
the six LEDs every 35 to 40 seconds and intercepts Agent key presses to switch
Codex thread. Both halves of the feature are therefore contended by the same
application, and nothing can arbitrate.

## The model: two sources, two roles

| Source | Authority over | Nature |
| --- | --- | --- |
| `claude agents --json` | membership: who occupies a slot | poll, official |
| plugin hooks | the state of each session | push, official |

This separation is not cosmetic, it is necessary. A missed hook — crash,
`kill -9` — pins the state to "running" indefinitely, and only the roster catches
it. Conversely the roster publishes no state at all. Neither source is sufficient
on its own.

Real roster output, on this repository:

```json
[
  { "pid": 47158, "cwd": "/Users/…/claude-codex-micro", "kind": "interactive",
    "startedAt": 1785370945651, "sessionId": "81f2c88d-…",
    "name": "claude-codex-micro-73" }
]
```

`--json` is explicitly meant for scripting: "does not require a TTY". `--all`
adds finished background sessions, `--cwd` filters by directory.

### State table

| State | Event | Deciding field | Colour |
| --- | --- | --- | --- |
| running | `UserPromptSubmit` | — | `#D97757` |
| needs you | `Notification` | `notification_type` ∈ {`permission_prompt`, `agent_needs_input`, `elicitation_dialog`} | `#C2483D` |
| idle | `SessionStart`, `Notification` / `idle_prompt` | — | `#6D5A7D` |
| done | `Stop` | — | `#5B8C6F` |
| closed | `SessionEnd`, or absence from the roster | `reason` | `#2F2927` |

`notification_type` is the only field that separates "you are being waited for"
from "it is working". The `auth_success`, `elicitation_complete` and
`agent_completed` types do not change the state: a red light must mean a decision
is expected, and nothing else.

## Evidence matrix

Measured on macOS `26.5.2` arm64, Claude `1.24012.9`, Claude Code `2.1.219`.

| Claim | State | Proof |
| --- | --- | --- |
| `claude agents --json` lists live sessions with `sessionId`, `pid`, `cwd`, `name` | confirmed | run, 3 sessions returned |
| A plugin hook receives the event as JSON on stdin | confirmed | plugin probe, 4 events captured |
| A hook inherits `CLAUDE_PID`, `CLAUDE_CODE_SESSION_ID`, `CLAUDE_CODE_ENTRYPOINT` | confirmed | environment read inside the hook |
| `CLAUDE_PID` equals the roster's `pid` | confirmed | `47158` on both sides |
| `$CLAUDE_PLUGIN_ROOT` expands inside a hook command | confirmed | `thread-status` plugin loaded with `--plugin-dir` |
| `CLAUDE_PLUGIN_DATA` differs with the loading mode | confirmed | `…/data/<name>-inline` with `--plugin-dir` |
| A `claude -p` session emits hooks without entering the roster | confirmed | session `439b9985` absent from `agents --json` |
| `CLAUDE_CODE_HOST_SESSION_ID` **does not identify** a session | confirmed | two distinct sessions share `local_f92b6e6a` |
| The `tty` separates terminal from Desktop | confirmed | `tty = ??` for the three Desktop sessions |
| Focusing a terminal window by `tty` in AppleScript | not tested end to end | scripts compiled by `osacompile`; no terminal session available, iTerm2 absent from the machine |
| A route to open a local Claude Code session in Desktop **by id** | **confirmed on this machine** | `claude://resume?session=<uuid>` opens the right session, verified on this machine; the route is absent from the deep-link documentation, which only mentions `claude://code/new` |
| `claude://resume` validates its target against a strict UUID regex | confirmed | read in the handler: the `uuid` is checked before `importCliSession`, then navigation |
| `claude://resume` fails when the transcript is absent from disk | reported, not tested | the handler's `transcript_missing` error path; nothing is reported back to the caller, `open` exits 0 either way |
| **Cycling** shortcuts between sessions in Claude Desktop | documented | `Ctrl Tab` / `Ctrl Shift Tab` and `Cmd Shift ]` / `Cmd Shift [` — Code tab shortcut table |
| A shortcut to select a session by its rank | non-existent | `1`–`9` only selects inside an open menu, and there is no session menu |
| Fallback for a Desktop session with no UUID id: activate the application | implemented | `open -b com.anthropic.claudefordesktop`, no Automation consent; the specific session stays unselectable |
| `claude --resume <id>` resumes a closed session | documented | session management documentation |
| The Codex Micro is an Espressif device | confirmed | `hidutil list`: VID `0x303a`, PID `0x8360` |
| Input's log cannot deliver the RGB protocol | confirmed | 66 `v.oai.*` lines, all responses, zero requests |
| `v.oai.thstatus` is the **per-thread** lighting | confirmed | comment and enumeration read in the ChatGPT bundle |
| `v.oai.rgbcfg` only covers two global zones | confirmed | same source, cross-checked with Input's model |
| The SDK is private and unlicensed | confirmed | `@worklouder/device-kit-oai`, `UNLICENSED`, private registry |
| 64-byte HID frame, `0x06` / channel `2` | **confirmed on hardware** | request sent, response `{"result":{"ok":1},"id":1,"method":"v.oai.thstatus"}` |
| Fragmentation: total length in the first report | **refuted** | correlated by `id`, the 101-byte payloads receive no response |
| Fragmentation: chunk length in every report | **confirmed on hardware** | ~140-byte payloads (3 reports) acknowledged with a correlated `id` — `scripts/lib/hid-frame.mjs`, see [`hid-lighting-protocol.md`](hid-lighting-protocol.md) |
| Responses are broadcast to every reader | confirmed | acknowledgements from the ChatGPT app were taken for ours until the `id` was checked |
| Per-slot writing is accepted | **confirmed on hardware** | six coloured pushes acknowledged with a correlated `id`, keys lit one by one — `scripts/lighting.mjs` probe |
| A write can fail on rapid repetition | observed | one `SetReport` in ~60 refused with `0xE00002BC` during reassertion |
| `id` → physical key mapping | **confirmed on hardware** | one-key-at-a-time probe: ids 0 to 5 follow the order of `SLOT_CONTROLS`, top row then the next, left to right |
| Rendering requires the `KV_OAI_AG00..05` keycodes on the six positions | **confirmed on hardware** | `Claude` layer with `KC_NONE`: no rendering; the same six positions given the Agent keycodes: all six colours render immediately |
| The firmware's predicate is layer index 0 | **refuted** | rendering works on the `Claude` layer at index 1 as soon as the keycodes are set there |
| Agent keys notify the host of their press | **confirmed on hardware** | `v.oai.hid` received for `AG00` to `AG05`, `act` 1 on press and 0 on release — `npm run lighting -- listen` |
| The ChatGPT app also intercepts those presses | **confirmed on hardware** | on the `Claude` layer, pressing an Agent key switches Codex threads |
| A native global shortcut is required for navigation | **refuted** | the keyboard names the slot on the HID channel already open; neither `RegisterEventHotKey` nor a macOS permission |
| `device.status` returns a 1-based layer index | reported, not re-verified | `layer_index: 1` = Codex layer, `2` = `Claude` layer; Input applies `layer_index - 1` |
| The `KV_OAI_AG00..05` keycodes are assignable from Input | **refuted** | a single occurrence each in the `app.asar`, inside the hard-wired definition of the native layer: absent from the key picker |
| An `{"ok":1}` guarantees a visible render | **refuted** | uncorrelated acknowledgements came from the ChatGPT app |
| A single-report write actually shows up | **confirmed on hardware** | slot 0 turned blue then off by the probe, observed |
| Rendering is reproducible | confirmed, after correction | the initial flakiness came from the wrong fragmentation; reproducible once the Agent keycodes are set |
| The device exposes a `0xff00` vendor collection | confirmed | `HID.devices()`: four collections, `0x0001/0x06`, `0x000c/0x01`, `0x000c/0x02`, `0xff00/0x01` |
| `node-hid` **can** open this device non-exclusively | **confirmed on hardware** | `HIDAsync.open(path, { nonExclusive: true })` then a successful `sys.version` round-trip; the earlier failure came from opening without the option (`new HID.HID(path)` opens in *seize* mode) |
| A non-exclusive IOKit open succeeds | confirmed | `IOHIDDeviceOpen(kIOHIDOptionsTypeNone)` accepted where `hid_open_path` fails |
| "Input Monitoring" is required | **undetermined** | granted in the context where IOKit succeeds: the two causes cannot be separated |
| Private IPC socket of the Codex app | present | `~/.codex/ipc/ipc.sock`, `srw-------` |

## The point that decides navigation

`CLAUDE_CODE_HOST_SESSION_ID` looks like the identifier that would be missing to
address a session in Claude Desktop. It is not one. Three independent Desktop
sessions, read with `ps eww`:

```text
pid 81796  local_f92b6e6a-2b3c-4cdf-8e43-c58a3e3681a2
pid 32491  local_f92b6e6a-2b3c-4cdf-8e43-c58a3e3681a2   ← same identifier
pid 47158  local_0c92bab5-02f7-4d17-a748-d0717a6c526e
```

Two distinct Claude Code sessions, neither parent nor child of one another, share
the same value. The identifier **groups** sessions, it designates none of them.
It therefore cannot serve as a navigation target, and the companion builds no URL
from it.

Direct consequence, and this is the product decision of the project:

| Surface | `tty` | Going to the session |
| --- | --- | --- |
| Terminal | real | `pid` → `tty` → window focus in AppleScript |
| Claude Desktop, IDE | `??` | `claude://resume?session=<sessionId>` |
| Closed session | — | `claude --resume <sessionId>` |

What was missing was not an identifier, it was the route. The roster's
`sessionId` is exactly the target `claude://resume` expects — the
`hostSessionId`, meanwhile, still designates nothing. **All six slots are
therefore navigable whatever the surface**, and the "activate the application"
fallback now only serves sessions whose id is not a UUID.

Two reservations, carried by the code rather than by this text: the route is not
documented, and the handler reports nothing back — `open` exits 0 even when the
resume fails for a transcript missing from disk. Focusing over AppleScript
requires macOS Automation consent, not Accessibility; going through `claude://`
requires neither.

## Traps encountered

- **A `claude -p` session or a subagent emits hooks without ever entering the
  roster.** Giving them a slot would fill all six keys with invisible sessions.
  Rule retained: the roster arbitrates membership, the hooks only set a state on
  a slot that is already open. Orphan states are held in a bounded pending queue,
  and drops are counted.
- **`CLAUDE_CODE_CHILD_SESSION=1` does not filter nested sessions.** The main
  session of a Desktop window carries it too.
- **The standard output of a `UserPromptSubmit` hook is injected into the
  conversation context.** A chatty emitter would end up in the user's prompt. The
  emitter writes nothing to stdout and always exits 0.
- **`CLAUDE_PLUGIN_DATA` is not a stable state path**: it is
  `…/data/<name>-inline` under `--plugin-dir` and `…/data/<name>` once installed.
  The state therefore lives under `~/.claude/thread-status/`, overridable with
  `CLAUDE_THREAD_STATUS_DIR`.
- **The `.jsonl` transcript format is declared internal and changes between
  versions.** No component reads them, including for state.

## Sending the information to the keyboard: measured negative result

The idea retained until then was to recover the RGB protocol by capturing
`~/Library/Logs/input/main.log` while the ChatGPT app animates the Agent keys.
**That path is closed**, and the measurement shows it unambiguously.

The log does contain 66 `v.oai.*` lines, but they have only two shapes:

```text
|wl_device_comm| No resolver found for id: 475 response:
  {"result":{"ok":1},"id":475,"method":"v.oai.thstatus"}
  {"result":{"ok":1},"id":121,"method":"v.oai.rgbcfg"}
```

Not one line carries `params`. These are **orphan responses**: the HID device is
opened non-exclusively, its input reports are broadcast to every reader, and
Input logs, as warnings, the responses to calls it never made. The direction we
care about — host → keyboard, the one carrying colours and states — never appears
there.

What the measurement gives anyway:

- both methods are called **as a pair**, `rgbcfg` then `thstatus` roughly 70ms
  later, and the pair repeats every 35 to 40 seconds;
- the device acknowledges with `{"ok":1}`, so the calls do land;
- Input's own methods in the same log are `device.status`, `host.focused_app`,
  `fs.list`, `fs.readbin`, `sys.version` — the `v.oai.*` namespace is clearly
  distinct and does not belong to Input.

Three locks remained at that point, and they were independent:

1. **The request format is unknown.** Recovering it requires a USB bus capture
   (output reports from the ChatGPT app to the device), not reading a log.
2. **Contention is untouched.** Last write wins, and the ChatGPT app pushes its
   configuration again every 35 to 40 seconds: colours written by a third party
   would be overwritten at that cadence while it runs.
3. **No sanctioned channel exists.** No public Work Louder SDK, and Hardware
   Buddy only exposes aggregate counters, with no session identity.

The Espressif VID puts the hardware in the same family as the ESP32 example
published with Hardware Buddy. That does not make the firmware modifiable, and
the ban on flashing stands in full: see the warning in
[`appsense-behavior.md`](appsense-behavior.md).

### Input's lighting model cannot express six colours

The next question, and a more interesting one: since the Work Louder app does
drive the lighting, would its own channel be enough? **No, and for a structural
reason, not a documentation one.**

The app does not model the `v.oai.*` methods: zero occurrences of `v.oai`,
`rgbcfg` or `thstatus` in its 226 MB `app.asar`. Its lighting travels inside the
device configuration, in the following shape — read from
`~/Library/Application Support/input/devices/<pid>/keymap.json`:

```json
"layers": [{
  "id": …, "name": "Claude", "color": 16711680, "linkedAppId": …,
  "lights": {
    "backlight": { "effect": "solid",    "brightness": 1, "speed": 0.5,  "magic": 1, "color": 14251863 },
    "underglow": { "effect": "rainbow",  "brightness": 1, "speed": 0.55, "magic": 1, "color": 16777215 }
  },
  "layout": { "keymap": [["KC_NONE","KC_NONE"], …], "encoders": […], "joystick": {…} }
}]
```

`14251863` is `#D97757`: the repository's Claude colour is already in place on
the hardware. And that is all the format allows:

- **two zones per layer**, `backlight` and `underglow`, one colour each;
- `layout.keymap` is a flat array of keycode strings — no per-key object, and
  therefore **nowhere to put a per-key colour**. An exhaustive search for any
  colour-shaped integer outside `lights` returns nothing.

Consequence: even with a perfect knowledge of Input's format, you cannot light
six keys in six colours. The per-key channel belongs exclusively to the ChatGPT
app's private `v.oai.*` namespace, which Input ignores completely.

What Input's channel **can** do, on the other hand: an aggregate signal on the
`backlight`, precisely the zone the ChatGPT app leaves alone according to
[`appsense-behavior.md`](appsense-behavior.md). One colour for "a session is
waiting on a decision", another for "at least one is working", a third for
"everything is done". The format is known, and the Claude colour is already
there.

That path is not open for all that: it requires writing the device configuration
during a session, which the repository's scope explicitly excludes — "no direct
write into Input's storage or the device" — and it would compete with Input's own
pushes. It therefore calls for a scope decision, not only code.

Measurement caveat: the local copy of `keymap.json` can lag behind what was
actually pushed to the device, and the observation above was not cross-checked
against a `sending device config` line — the current log contains none.

### The per-key channel exists, and it is readable locally

The ChatGPT app bundles the private SDK that talks to the Codex Micro:
`@worklouder/device-kit-oai` `0.1.11` and `@worklouder/wl-device-kit`, inside
`/Applications/ChatGPT.app/Contents/Resources/app.asar`. The file
`node_modules/@worklouder/device-kit-oai/dist/rpc_api_oai/rpc_api_oai.js`
contains the enumeration, in plain text:

```js
// Vendor specific.
VendorJsonRpcMethods["ThreadsLighting"] = "v.oai.thstatus";  /** Per-thread accent lighting. */
VendorJsonRpcMethods["RgbConfig"]       = "v.oai.rgbcfg";    /** Keys and ambient zone lighting. */
```

The comment settles the question: `thstatus` is the **per-thread** lighting,
`rgbcfg` only covers the two global zones — which matches Input's two-zone model
measured above exactly. The sending method is documented in the bundle:

```js
// Only the thread id is required on each entry. […] optional color, brightness,
// effect, speed, and sync flags (brightness 0 = off through 1 = full on;
// speed 0 = stopped through 1 = fast). […] omit optional fields to leave those
// parameters unchanged on the device.
async sendThreadsLighting(threads) {
  let minimized = threads.map((thread) => { return { id: thread.id, c: thread.color, … } });
```

So: an array of entries, one per slot, each addressed by `id`, with `c` as a
`0xRRGGBB` integer, `b` and `s` normalised from 0 to 1, and sync flags. Partial
updates are provided for. The effect enumeration is in plain text too:
`snake = 2`, `rainbow = 3`, `breath = 4`, `gradient = 5`, `shallowBreath = 6`.

Two further methods exist in the same namespace and are not studied here:
`v.oai.hid` and `v.oai.rad`.

### HID frame confirmed on hardware

The reported frame is correct. A no-op request — an entry reduced to `{"id":0}`,
which according to the SDK changes no colour — was sent to the device and
acknowledged:

```text
sent      0602367b226d6574686f64223a22762e…   {"method":"v.oai.thstatus","params":[{"id":0}],"id":1}
response  0602367b22726573756c74223a7b226f…   {"result":{"ok":1},"id":1,"method":"v.oai.thstatus"}
```

64-byte reports, byte 0 = report ID `0x06`, byte 1 = channel `0x02`, byte 2 =
length, UTF-8 payload from byte 3, so 61 bytes per report. **The same frame
serves in both directions.**

**Fragmentation is confirmed, in the SDK's scheme.** The initial hypothesis —
byte 2 of the first report carrying the total length — is refuted by measurement.
The scheme that works is the one read in the bundle: **byte 2 carries the chunk
length, on every report**, the payload being split into 61-byte chunks
reassembled by the device. Proof: `thstatus` pushes of ~140 bytes (six entries,
three reports) were acknowledged with a correlated `id`, and the keys lit one by
one — `scripts/lighting.mjs` probe, framing in `scripts/lib/hid-frame.mjs`.

The trap is worth remembering, because it silently invalidates any measurement:
**the device's responses are broadcast to every HID reader**, and the ChatGPT app
provokes some every 35 to 40 seconds. A probe that takes the first response it
sees therefore takes ChatGPT's acknowledgements for its own. Six writes had been
declared successful that way while none had landed — which explains the absence
of any visible change. Correlated by the `id` field, the same 101-byte payloads
("total length" scheme) receive no response at all.

Any probe on this device must therefore check the response's `id`. That is the
most expensive lesson of this measurement campaign.

Routing is done by report ID, not by collection: IOKit enumerates a single device
where hidapi sees four collections, and `SetReport` with identifier `0x06`
reaches the right channel.

**`node-hid` does this job on macOS, provided you ask for non-exclusive.** The
failure measured during the first campaign came from a `new HID.HID(path)` open
**without options**: hidapi then opens in *seize* mode, refused while another
application holds the device. `node-hid` 3.4.0 does expose
`hid_darwin_set_open_exclusive` — `src/HIDAsync.cc:137` — through
`HIDAsync.open(path, { nonExclusive: true })`, and the `sys.version` round-trip
succeeds that way while ChatGPT holds the same device (shipped transport:
`scripts/lib/hid-device.mjs`). The IOKit non-exclusive open
(`kIOHIDOptionsTypeNone`), validated by the Swift probe, amounts to the same;
both routes work.

Still reported and not re-verified: the Electron guard, according to which
`codexMicro.updateLighting` would only accept updates from the `webContents` of
ChatGPT's main window.

### Acknowledged is not displayed

The device acknowledged `{"ok":1}` on all six slots, with the full canonical
entry — `c`, `b`, `e`, `s`, `sk`, `sa` — and **nothing changed on the keyboard**.
The acknowledgement therefore covers receiving the call, not rendering it.

Three hypotheses were on the table at that point, in order of consequence for the
product:

1. **Layer dependency.** The observation was made on the `Claude` layer, whose
   Input configuration already forces a solid `#D97757` `backlight`. If
   per-thread lighting only renders on the native Codex layer, where the Agent
   keys really are Agent keys, then the feature is unreachable where this project
   needs it. That was the hypothesis to rule out first.
2. **`sk` inverted.** `syncKeysLighting` could mean "propagate this colour to the
   key zone" just as well as "this slot follows the key zone" — the second
   reading would overwrite the requested colour.
3. **`rgbcfg` gates `thstatus`.** The ChatGPT app always sends the two as a pair,
   `rgbcfg` then `thstatus` 70ms later. The key zone may need to be put into a
   mode that allows accents.

Hypothesis 1 turned out to be the right track, but not for the reason stated: see
below. Hypotheses 2 and 3 were never needed.

### Rendering works, but once

A single-report payload —
`{"method":"v.oai.thstatus","params":[{"id":0,"c":255,"e":1}]}`, 61 bytes —
**actually lit the first key blue**, then turned it off on restore. The complete
chain was therefore demonstrated: frame, addressing by slot, colour encoding,
solid effect, turn-off.

On subsequent runs, the same call produced nothing. And during the observation,
the other keys took on an orange tint **one by one**: the ChatGPT app reasserting
its own state.

A non-reproducible success, on a device where a second writer periodically
repaints, does not read as a failing protocol. It reads as a **lost race**. The
protocol was acquired; what was missing was exclusive control of the display
surface.

### The layer constraint, and its resolution

**Resolved.** The firmware only renders per-thread lighting on keys whose keycode
is `KV_OAI_AG00` to `KV_OAI_AG05`. It is not the layer index that matters: the
firmware has to know which physical key is slot N, and the keycode is what tells
it. On a layer where those positions are `KC_NONE`, there is no slot to paint.

The decisive clue was in Input's bundle, where the native Codex layer is defined
exactly like this:

```js
base: [
  [ {keycode:"KV_OAI_AG00"}, {keycode:"KV_OAI_AG01"} ],
  [ {keycode:"KV_OAI_AG02"}, {keycode:"KV_OAI_AG03"}, {keycode:"KV_OAI_AG04"}, {keycode:"KV_OAI_AG05"} ],
  …
]
```

Two keys then four — the exact geometry of the six Agent keys, in the order
confirmed by eye.

These keycodes appear **only once** each in Input's 226 MB `app.asar`: they are
absent from its key picker, and therefore unassignable from the interface. Hence
[`scripts/enable-agent-keys.mjs`](../../scripts/enable-agent-keys.mjs), which
writes them into a profile export to be re-imported through the official **Import
Profile** flow, without ever touching the layer at index 0.

No Claude shortcut is lost: those six positions were `no-action`, and the
shortcuts live on the next row.

**But the cost is not zero, and it is not merely theoretical.** These keycodes
are not simple display markers: the firmware emits a `v.oai.hid` notification,
and **the ChatGPT app reacts to it by switching Codex thread**. Measured: on the
`Claude` layer, pressing an Agent key switches Codex threads.

The same application therefore contends for both halves of the feature:

| Resource | What the ChatGPT app does |
| --- | --- |
| the six LEDs | rewrites its configuration every 35 to 40s |
| the six presses | intercepts them and switches Codex thread |

There is no arbitration possible: notifications are broadcast to every reader,
and nothing can ask ChatGPT to be quiet. **Quitting the ChatGPT app solves both
at once** — lighting writes are no longer overwritten, and presses have a single
recipient.

That is therefore the real condition of use of the feature, and it has to be
announced as such: the six Claude lights and the ChatGPT app do not coexist.

**Verified on hardware**: after import, with the `Claude` layer active,
`lighting set all #00FF00` does light all six keys green.

### The two workarounds that had failed

Before the keycode explanation was found, the working theory was that per-thread
lighting only rendered on the native Codex layer, because on the `Claude` layer
the writes were acknowledged and nothing appeared.

The probable explanation seemed to lie in Input's lighting model measured above:
each layer carries its own `lights.backlight`, and the `Claude` layer's is a
`solid` at `#D97757`. The layer's rendering would then cover the per-thread
accents, which the firmware might only compose on the layer that carries the
"Agent keys" role.

Two workarounds were tried, from least to most costly:

1. **Neutralising the key zone at runtime**, with `v.oai.rgbcfg` and an `off`
   effect on `keys`, then pushing the accents. **Tried, no effect**: on the
   `Claude` layer nothing appears, and the same write renders normally as soon as
   the Codex layer becomes active again. `rgbcfg` sets a global zone, not the
   layer's own `backlight`, which wins while that layer is active.
2. **Neutralising the `Claude` layer's `backlight`**, to `off` or brightness 0,
   through the Input app. **Tried, no effect**: the `Claude` layer stays black,
   and the same write applies the colour to all six keys as soon as the Codex
   layer becomes active again.

Both failures pointed in the wrong direction: they looked for what was *covering*
the accents, whereas the firmware was composing none, for lack of a keycode to
identify the slots.

### What blocks now is no longer technical

| Lock | State |
| --- | --- |
| Knowing the per-key protocol | **lifted**, readable locally |
| Licence | `UNLICENSED`, private package, closed GitHub Packages registry |
| Write contention | untouched: ChatGPT pushes again every 35 to 40s |
| Sanctioned channel | non-existent, neither OpenAI nor Work Louder |

The useful distinction for a public repository: **documenting an observed format**
is what this repository already does for Input; **redistributing the SDK or its
code** is excluded by its licence. Reimplementing the observed format to
interoperate with a device you own is the usual route, and remains a decision to
take knowingly, not a given.

The contention lock is not solved by knowing the format: two writers on a
non-exclusive HID, last write wins, and the ChatGPT app re-emits periodically. No
deterministic coexistence strategy has been identified — only untested
hypotheses, among them removing ChatGPT's macOS input-monitoring permission,
which would also disable its own keys.

## What is implemented

| Component | Path |
| --- | --- |
| Hooks plugin | [`thread-status/`](../../thread-status/README.md) |
| Pure reducer, six slots | `scripts/lib/thread-slots.mjs` |
| `watch` / `status` / `focus` / `doctor` companion | `scripts/thread-status.mjs` |
| HID framing and lighting model | `scripts/lib/hid-frame.mjs`, `scripts/lib/hid-lighting.mjs` |
| `node-hid` transport | `scripts/lib/hid-device.mjs` |
| Lighting CLI, `DeviceAdapter` | `scripts/lighting.mjs` |
| Agent keycodes on the `Claude` layer | `scripts/enable-agent-keys.mjs` |
| Tests | `tests/thread-slots.test.mjs`, `tests/hid-frame.test.mjs`, `tests/hid-lighting.test.mjs` |

The companion's output is `~/.claude/thread-status/slots.json`. It is the seam
the `DeviceAdapter` consumes: `node scripts/lighting.mjs watch` follows that file
and pushes the six state colours to the keyboard.

The physical keys are wired: the six Agent keys are `key-9`, `key-10`, `key-5`,
`key-6`, `key-7`, `key-8` — see `KEY_CONTROL_LOCATIONS` in
`shared/input-profile.mjs` — and they emit `v.oai.hid` on the HID channel already
open, so `npm run lighting -- watch --focus` routes a press to `focus <n>` with
no native global shortcut and no macOS permission.

## What is still unestablished

- AppleScript focus by `tty` has not been exercised end to end: no terminal
  Claude Code session was available, and iTerm2 is not installed on the
  measurement machine. Only Terminal.app could be tested.
- The complete list of `CLAUDE_CODE_ENTRYPOINT` values. Only one is observed:
  `claude-desktop`.
- Whether `claude agents --json` includes sessions started by an IDE extension.
- Whether `claude://resume` fails, and how, when the transcript is missing from
  disk. The handler has a `transcript_missing` error path, but `open` exits 0
  regardless, so nothing surfaces to the caller.
- How long the undocumented `claude://resume` route will last. It is verified on
  Claude `1.24012.9` and can change with an application update.
- Any coexistence strategy with the ChatGPT app on the same HID device. None has
  been tested, and none looks deterministic.
- `v.oai.hid` and `v.oai.rad`, present in the same namespace, not studied.
- Whether Work Louder or OpenAI would agree to open the channel. That is the only
  route that would lift the licence, the contention and the longevity questions
  at once.
- The roster's behaviour, from the user's point of view, when more than six
  sessions are alive: overflow is counted and reported, but the ergonomics
  retained are not validated.

## Sources

- [Claude Code — hooks](https://code.claude.com/docs/en/hooks)
- [Claude Code — session management](https://code.claude.com/docs/en/sessions)
- [Claude Code — plugin creation](https://code.claude.com/docs/en/plugins)
- [Claude Desktop — open with a link](https://support.claude.com/en/articles/14729294-open-claude-desktop-with-a-link)
- [Anthropic — Hardware Buddy BLE Protocol](https://github.com/anthropics/claude-desktop-buddy/blob/main/REFERENCE.md)
