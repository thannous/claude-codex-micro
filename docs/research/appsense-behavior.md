[English](appsense-behavior.md) · [Français](../fr/research/appsense-behavior.md)

# AppSense — real behaviour measured on the Codex Micro

## Verdict

**AppSense has no return path.** It is a set of application → layer rules, and
every rule is a **one-way** transition. There is no default layer, no fallback,
and no deactivation when the linked application loses focus.

The consequence to keep in mind before designing a layer: leaving Claude for an
unlinked application leaves the board on the Claude layer, indefinitely. The
layer therefore has to be safe outside Claude, since that is where it will stay
active.

## The model, and what it explains

| foreground application | rule | effect |
| --- | --- | --- |
| linked to a layer | found | switches to that layer |
| not linked | none | **nothing happens, the board stays where it is** |

A "round trip" between two applications is therefore not one trip out and one
back: it is **two trips out**, which requires both applications to be linked,
each to its own layer. The layer at index `0` can perfectly well be a target,
contrary to what one might assume — but only if an application is explicitly
linked to it.

Measurements that establish the model, on firmware `v0.4.1` and Input `0.17.3`:

- from the base layer, bringing Claude to the foreground does switch to the
  `Claude` layer — the trip out works;
- with `com.openai.codex` linked to the base layer, alternating between Claude
  and ChatGPT does alternate the two layers;
- with the same configuration, leaving Claude for the Finder changes **nothing**:
  the `Claude` layer stays active.

## Practical limit

Six layers at most, and a single `linkedAppId` per layer: at most **six
applications** can trigger a switch. Any other application leaves the board on
the last activated layer.

For a machine where you move between more applications than that, there is only
the touch sensor, which cycles the layers by hand.

## Status at the vendor

The expected fallback is a **missing feature, not a bug**. It is requested on the
Work Louder feedback board with status `Planned`, no ETA, and an administrator
confirmed it:

> we plan to implement it but we don't have an ETA yet

No Input release note, from `0.11.0` to `0.18.0-rc.8`, mentions AppSense,
application focus or layer switching. Updating Input therefore changes nothing
about this behaviour.

Sources: <https://feedback.worklouder.cc/p/switch-to-standard-when-linked-software-isnt-in-focus>
and <https://feedback.worklouder.cc/p/feedback-first-hour-of-use>.

## Host-side mechanics, useful for diagnosis

**AppSense is driven by the host.** Input watches the foreground application and
pushes a `host.focused_app` JSON-RPC call to the board; the firmware then
consults its link table and switches. Two consequences:

- **AppSense stops dead if Input is not running.** No switch happens any more,
  and the board freezes on its last layer. "Close Input" is therefore the worst
  possible workaround.
- Detection is done by **polling at 1000ms**, through `osascript`, not by a
  system subscription. A switch can therefore take up to a second: do not
  conclude too quickly during a test.

The send is **unconditional** — Input does not consult the link table before
emitting, all the filtering is on the firmware side — and there is no message
meaning "no linked application". The firmware never reports which layer it
switched to: the response to `host.focused_app` is always `null`.

## Traps hit during the investigation

- **`Auto detect` does not deduplicate by process.** Each run creates a new
  `linkedApps` entry. Two entries for the same application, and two layers
  claiming them across two different profiles, make diagnosis unreadable. Run
  `Auto detect` only once per application.
- **An exported `*-profile.json` does not carry the `linkedApps` table**, only
  the `linkedAppId` references set on the layers. An imported profile therefore
  cannot create a link: the target entry must already exist, otherwise the
  reference dangles and the link is silently dead.
- **The local copy
  `~/Library/Application Support/input/devices/<pid>/keymap.json` can lag**
  behind what was actually pushed. The reliable source is
  `~/Library/Logs/input/main.log`, where `|device_keymap_service| sending device
  config :` is followed by the full JSON.
- **`device.status.layer_index` is 1-based**, and Input converts it with `r - 1`.
  A `layer_index: 2` designates the layer at index `1`.
- The `cannot send, no device connected` errors accompanying every focus change
  are present from startup: Input instantiates one client per transport and only
  the one on the real transport answers. That is not the failure.

## Contention with the ChatGPT application

Both applications hold the same HID device, opened non-exclusively: reads are
broadcast to both, only writes compete, and **the last write wins**. You can see
it directly in Input's log, which receives responses to `v.oai.rgbcfg` and
`v.oai.thstatus` calls it never made.

A consequence to know about for any visual indicator: **ChatGPT overwrites the
underglow of non-Codex layers** whatever the active layer — a confirmed bug, not
fixed on this model. The **backlight** is the zone it leaves alone, and therefore
the only reliable layer indicator while ChatGPT is running.

What ChatGPT does not do: it never repositions the layer. It is therefore not the
cause of the stuck layer.

## Warning

**Do not flash any firmware from Input's recovery screen.** It offers Nomad,
Knob, KnobF1, Creator Micro V2 and XYZ R2, does **not** offer Codex Micro
firmware, and does **not** warn about the incompatibility. A Codex Micro was
bricked exactly that way, and no official recovery firmware is published.

Source: <https://feedback.worklouder.cc/p/input-can-flash-incompatible-firmware-onto-codex-micro-without-warning>

## What is still unestablished

- The order in which the firmware walks its link table, and whether it searches
  the active profile only or every profile. During the investigation, a
  configuration whose base layer referenced a non-existent `linkedAppId` seemed
  to work where a valid reference failed. The discrepancy was not reproduced and
  is most likely an artefact of the test sequence, but it is not explained.
- The reason a three-layer profile is refused on import: nothing is logged on the
  main process side, the cause is in the renderer log, reachable through
  `Help > Download Logs`.
