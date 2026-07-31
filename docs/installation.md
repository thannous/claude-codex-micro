[English](installation.md) · [Français](fr/installation.md)

# Generating and installing the Claude V1 profile

The V1 path transforms an official Input `0.17.3` export locally. The source
profile must contain exactly one `Claude` layer, outside index `0` and already
linked to Claude Desktop with AppSense. The generator only modifies that layer,
in a copy, and produces a new `*-profile.json`.

It never clicks on your behalf, never runs `Reset settings`, never flashes
firmware, and never modifies a system shortcut.

## Recommended GUI path

From the root of the repository:

```sh
npm run configure
```

The first launch may prepare `prototype/`'s locked dependencies. The
configurator then opens locally in the browser.

1. export the active profile from Work Louder Input;
2. drop that `*-profile.json` into the configurator;
3. check the single `Claude` layer, its AppSense link and the native index `0`;
4. customise the 13 switches, the dial rotation and the joystick; only the
   layer-switching touch sensor stays reserved;
5. download `Claude-macOS-profile.json`;
6. import it with **Add New**, without replacing the source profile.

Generation refuses a wrong device, a missing or duplicated Claude layer, a target
at index `0`, and a missing AppSense link. It preserves the native layer, the
other layers, the other profiles and the other AppSense links. The rest of this
guide describes the same path with the detailed CLI checks.

## 1. Check the repository

From the local copy:

```sh
cd claude-codex-micro
git status --short
npm ci --no-audit --no-fund
npm run check
```

Do not stash or delete unrelated changes. Private files created by the tools stay
under `.local/`, which Git ignores.

## 2. Inspect the environment without writing

```sh
node scripts/input-layer.mjs doctor --json
```

Check in particular:

- Input `0.17.3`, bundle `it.focusense.input-app`;
- Claude, bundle `com.anthropic.claudefordesktop`;
- the detected Input configuration path;
- firmware `v0.4.1` in Input's Setup screen;
- the native Codex layer at index `0`.

`doctor` modifies nothing. If the installation uses a custom path, set
`WORK_LOUDER_INPUT_USER_DATA` to that path first. An arbitrary `--config-root`
is refused.

## 3. Export the original profile with Input

This step is the reference backup for the device's keymap.

1. open Input and select the currently active profile;
2. check that exactly one `Claude` layer exists, outside index `0`, and that it
   already has the Claude AppSense link;
3. visually inventory the other profiles, layers and links;
4. use the profile menu, then **Export Profile**;
5. keep the `*-profile.json` file in a local location;
6. quit Input completely before copying its local configuration.

The exported profile can contain private information. Never commit it.

## 4. Create and verify the restorable backup

Example:

```sh
node scripts/input-layer.mjs backup \
  --profile-export "$HOME/Downloads/Mac-profile.json" \
  --input-version 0.17.3 \
  --firmware-version v0.4.1 \
  --json
```

The command:

- refuses to continue if Input is running;
- copies the recognised configuration to `.local/input-backups/<date>/`;
- copies the official profile export;
- excludes only disposable caches;
- computes a SHA-256 sum for every file;
- reads the backup back immediately.

Independent verification:

```sh
node scripts/input-layer.mjs verify-backup \
  --backup .local/input-backups/<id> \
  --json
```

The result must contain `"ok": true`.

## 5. Generate the local inventory

```sh
node scripts/input-layer.mjs inventory \
  --profile-export "$HOME/Downloads/Mac-profile.json" \
  --output .local/inventories/current.json \
  --json
```

Check in the result:

- `protectedLayerIndexes: [0]`;
- the name of the native layer at index `0`;
- exactly one layer named `Claude`, with an index above `0`;
- the presence of a candidate AppSense field on that layer.

The tool does not publish the AppSense values it finds; it only reports the
candidate field paths. The detailed inventory stays local.

## 6. Simulate the installation

```sh
node scripts/input-layer.mjs install \
  --inventory .local/inventories/current.json \
  --profile-export "$HOME/Downloads/Mac-profile.json" \
  --dry-run \
  --json
```

The dry run must:

- select the single existing `Claude` layer;
- protect index `0`;
- refuse a missing or duplicated `Claude`;
- announce `guided-ui` and the local transformation of the profile.

## 7. Prepare the real session

Quit Input, then:

```sh
node scripts/input-layer.mjs install \
  --apply \
  --inventory .local/inventories/current.json \
  --profile-export "$HOME/Downloads/Mac-profile.json" \
  --open-input \
  --json
```

Before opening Input, the command creates and verifies a new safety backup. It
then writes a session state under `.local/sessions/`. A second, unrestored run is
refused.

## 8. Generate the local profile

With Input closed, run:

```sh
npm run build:profile -- \
  "$HOME/Downloads/Mac-profile.json" \
  "$HOME/Downloads/Claude-macOS-profile.json"
```

The output file is created without overwriting an existing one. The generator
refuses a wrong device, a missing or duplicated Claude layer, a target layer at
index `0`, and a missing AppSense link.

The generated mapping is:

| Physical position | Action |
| --- | --- |
| row of four square keys, left | `⌘N` |
| same row, second | `⌘D` |
| same row, third | `⌘⇧D` |
| same row, right | `Esc` |
| upper-left wheel, clockwise / counterclockwise | **Claude Effort** `+1` / `−1` |
| upper-left wheel press | configurable separately |
| upper-right joystick, no press | four arrows |

Wheel rotation is in **Claude Effort** mode by default. Each notch sends `⌘⇧E`,
waits for the picker to open, then `←` or `→` and `Esc`. It therefore moves to
the previous or next available effort level without using `Enter`. The levels
actually offered depend on the model and on the Claude Desktop version.

The GUI lets you set it back to page-by-page scrolling, line-by-line scrolling,
volume, or unassign it.

`⌘⇧E` is a toggle: the final `Esc` is mandatory — without it the next notch would
close the picker instead of opening it.

The macro therefore carries two delays, for a cost of roughly 90ms per notch:

- **80ms** on the ⌘ release, the time for the picker to appear. Below 40ms the
  arrow leaves before the picker has focus and the level change is lost with no
  error message;
- **10ms** on `Esc`, the time for the picker to paint the level reached before
  closing. Without it the picker only flickers and the chosen level is never
  displayed.

These delays are executed by the firmware, and turning fast while a macro is
running can lose notches. The mode suits adjustments of a few levels, not a
continuous sweep.

The calibration and what remains unproven are detailed in
[`docs/research/effort-wheel-calibration.md`](research/effort-wheel-calibration.md).

The reference diagram is
[`profiles/claude-shortcuts/assets/layout.svg`](../profiles/claude-shortcuts/assets/layout.svg).

## 9. Import without recreating AppSense

1. in Input, choose **Add New**;
2. select `Claude-macOS-profile.json`;
3. activate the new profile;
4. check that the `Claude` layer keeps its AppSense link;
5. do not touch any other AppSense link.

The generator preserves the local AppSense identifier without publishing it. If
the link is missing, go back to the original profile and create it by hand before
a new export.

### Forcing a link, or adding a second one

Two options write an AppSense reference instead of only carrying over the one
from the backup:

```bash
CLAUDE_APP_SENSE_ID="<replace-with-current-Claude-linkedAppId>"
RETURN_APP_SENSE_ID="<replace-with-current-return-app-linkedAppId>"
node scripts/build-input-profile.mjs backup.json output.json \
  --app-sense-id="$CLAUDE_APP_SENSE_ID" \
  --base-layer-app-sense-id="$RETURN_APP_SENSE_ID"
```

Resolve both values from the current device configuration and verify them before
running the command. The placeholders are intentionally non-numeric so a copied
command fails instead of silently linking the wrong applications.

`--app-sense-id=<n>` forces the `Claude` layer's reference and removes the need
to require one in the backup: this is the "repair a lost link" use case.

`--base-layer-app-sense-id=<n>` links the native layer to a **second**
application. That is the only way to leave the `Claude` layer automatically,
since AppSense has no return path: the exit is itself an entry into another
linked layer. The native keymap stays intact down to the keycode, only the link
is added, and the generator refuses to have both layers point at the same entry.

**These options write a reference, never an entry.** A `*-profile.json` does not
carry the `linkedApps` table: the target entry must already exist on the board,
created once in Input's UI with `Auto detect`. A reference to a missing entry
imports **without error** and leaves AppSense dead without saying so. Read the
real identifiers first, in `~/Library/Logs/input/main.log`, where
`sending device config :` is followed by the full JSON. Keep that log local and
never paste it into an issue: it can contain device addresses, identifiers,
tokens and other private parameters. Copy only the required `linkedAppId`
numbers, and redact every sensitive value before sharing an excerpt. Run
`Auto detect` only once per application, since it does not deduplicate.

The GUI exposes the same two settings in the **Verify and generate** step, under
"AppSense links". Leaving the fields empty is the same as not passing the
options: the backup's links are then carried over as they are.

Details of the measured behaviour:
[`docs/research/appsense-behavior.md`](research/appsense-behavior.md).

## 10. Hardware validation

Test in a low-stakes conversation, one action at a time:

- [ ] Claude in the foreground activates the existing layer, not index `0`;
- [ ] `⌘N` opens a new conversation;
- [ ] `⌘D` activates voice mode;
- [ ] `⌘⇧D` shows or hides the diff;
- [ ] `Esc` cancels or closes only the expected context;
- [ ] clockwise dial goes down and counterclockwise goes up;
- [ ] in Claude Effort mode, each notch changes exactly one level and closes the
      picker without sending a prompt;
- [ ] in Claude Effort mode, the level reached is readable before the picker
      closes, and a notch triggered when coming back from another application
      does change it: that is the unfavourable case, where failure is silent;
- [ ] the joystick emits the four arrows;
- [ ] every unused control stays free of dangerous actions;
- [ ] coming back into Claude re-activates the layer;
- [ ] switching to the Finder **leaves** the Claude layer active — that is the
      expected behaviour, not a defect: AppSense has no return path, see
      [`docs/research/appsense-behavior.md`](research/appsense-behavior.md).
      Check instead that no action on the layer is dangerous outside Claude;
- [ ] quitting and relaunching Input preserves the configuration;
- [ ] no other profile, layer or AppSense link has changed.

Do not test Enter, permissions, deletion, push or deployment.

## 11. Capturing a shareable layer artefact, if any

After validation, use **Export layer** in Input, then:

```sh
node scripts/input-layer.mjs sanitize-export \
  --input "$HOME/Downloads/Claude-layer.json" \
  --output profiles/claude-shortcuts/artifacts/claude-desktop-macos-layer.json
```

The sanitiser refuses absolute paths, ports, hardware addresses, secrets,
AppSense identifiers and devices other than `codex_micro`. After sanitisation,
record the exact SHA-256 in `manifest.json`. The validator also compares the
actions, the wheel and the joystick against the canonical mapping.

Before promoting the status: import that copy into an isolated configuration,
verify the mapping, attempt a second import, and restore the original profile.

## 12. Rollback

Simulation:

```sh
node scripts/input-layer.mjs rollback \
  --backup .local/input-backups/<id> \
  --dry-run \
  --json
```

Primary method:

1. open Input;
2. use **Import Profile**;
3. select the `*-profile.json` in the backup's `official-profile-export` folder;
4. set that profile back as the current one;
5. check the Codex layer, every other layer and every AppSense link;
6. relaunch Input and repeat the check.

After the official re-import and the device check, the session can be marked as
restored, so that a future installation is no longer blocked by the previous
state:

```sh
node scripts/input-layer.mjs rollback \
  --backup .local/input-backups/<id> \
  --session .local/sessions/claude-desktop-macos-codex-micro-v1.json \
  --apply \
  --confirm-official-profile-import \
  --json
```

That option records a confirmation from the user; it does not replace the
hardware check.

Restoring the application storage raw remains a secondary fallback and not proof
that the device was restored. It deliberately requires the following explicit
options, with Input closed. `--config-root` must match exactly a detected Input
path or `WORK_LOUDER_INPUT_USER_DATA`:

```sh
node scripts/input-layer.mjs rollback \
  --backup .local/input-backups/<id> \
  --apply \
  --restore-storage \
  --acknowledge-unverified-storage-restore \
  --session .local/sessions/claude-desktop-macos-codex-micro-v1.json \
  --json
```

Before copying the backup back, the tool atomically renames the current Input
folder to a safety copy named `*.before-codex-restore-*`. If the copy fails, that
folder is put back. This path stays secondary: never use `Reset settings` to roll
back.
