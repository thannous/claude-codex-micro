[English](scope-and-limitations.md) · [Français](fr/scope-and-limitations.md)

# Scope and limitations

## In scope for V1

- safe conventions for a preset library;
- Claude manifest and physical mapping;
- protection of the native Codex layer at index `0`;
- selection of a single existing `Claude` layer after inventory;
- local preservation of its Claude Desktop AppSense link;
- local generation of a new Input `0.17.3` `*-profile.json`;
- official profile export as the primary backup;
- local copy verified by SHA-256;
- dry run, session state, duplicate refusal and guided rollback;
- fail-closed sanitisation of a real layer export;
- transactional tests on isolated copies;
- separate analysis of Hardware Buddy.

## Not done on hardware in this branch

- testing the physical identifiers;
- importing a Codex Micro `*-layer.json`;
- persistence across a restart;
- focus-loss test;
- restoring the hardware keymap.

## Always out of scope

- `Reset settings`;
- deleting an existing profile or layer;
- modifying system shortcuts;
- flashing or redistributing firmware;
- approving permissions from the keyboard;
- destructive actions, pushes or deployments;
- publishing a raw export or a hardware identifier;
- presenting Hardware Buddy as working without proof;
- redistributing the `@worklouder/device-kit-oai` SDK or its code.

## Amendment: volatile lighting writes

Until now the repository ruled out any direct write to the device. This
amendment opens **one precise case, and one only**: sending HID output reports
carrying the runtime lighting state.

The distinction the amendment rests on is persistence, not the nature of the
channel:

| Write | Status |
| --- | --- |
| HID lighting report, volatile, lost on disconnect | **in scope**, under conditions |
| device configuration, keymap, layers, layer colours | out of scope, unchanged |
| Input's application storage | out of scope, unchanged |
| firmware | out of scope, unchanged |

Cumulative conditions, all required:

1. **Explicit opt-in.** No write by default, never on first launch.
2. **Volatile only.** Nothing that survives a device disconnect.
3. **Original implementation.** The observed format is documented; the
   proprietary SDK is neither copied, nor redistributed, nor bundled.
4. **Documented exit boundary and explicit neutralisation.**
   `lighting-probe.mjs --map` turns the six slots off after a normal sweep and
   on `SIGINT`; `lighting.mjs off` does so on demand. The long-running
   `set --hold` and `watch` paths close their HID session on `SIGINT`, but do
   not neutralise the last volatile state, and shutdown or exception paths are
   not covered. Disconnect the device or run `npm run lighting -- off` when a
   neutral state is required.
5. **Documented contention.** The ChatGPT app re-emits every 35 to 40 seconds,
   the last write wins, and no deterministic coexistence is promised.
6. **Reversible by abstention.** Not running the tool is enough to return to the
   original state; there is nothing to uninstall on the hardware side.

What the amendment does not change: key remapping still goes exclusively through
the Input profile flow, and keystroke capture stays out of scope.

Basis retained for the reimplementation: interoperability with a device the user
owns, original code, no redistribution. See
[`research/thread-status-feasibility.md`](research/thread-status-feasibility.md)
for the measurements that establish the format.

## Confidence matrix

| Claim | State | Proof |
| --- | --- | --- |
| Codex Micro visible as a BLE HID | confirmed locally | I/O observation of 27 July 2026 |
| Input `0.17.3` installed | confirmed locally | bundle and real profile |
| Firmware `v0.4.1` installed | confirmed locally | Setup screen |
| Six layers and AppSense | confirmed by Work Louder | vendor documentation |
| Layer and profile import/export | observed in Input `0.17.2` | sanitised analysis of the official package |
| `*-layer.json` envelope | observed statically | AST of the export function |
| Importable Claude artefact | not available | real export required |
| Claude AppSense link preserved | confirmed in the generated profile | generator tests and real export |
| Return to the previous layer | not tested | hardware test required |
| Tool backup/rollback | validated on a fixture | isolated Node tests |
| Real device restore | not tested | profile import + hardware check required |
| Nordic UART / Hardware Buddy | unknown | GATT and firmware evidence required |

## Compatibility

The current observation covers macOS `26.5.2` arm64, Claude `1.24012.9`,
Input `0.17.3` and firmware `v0.4.1`. The analysis of the `0.17.2` sharing
mechanism remains historical. This combination is not a guaranteed compatibility
range.

See [`compatibility.md`](compatibility.md).

## Limit of the local rollback

The copied Input configuration can carry metadata useful to the application, but
the keymap is also written to the device. Consequently, the primary restore path
is the official **Import Profile** flow. Restoring the application folder raw
requires additional consent and is not enough to promote the preset.
