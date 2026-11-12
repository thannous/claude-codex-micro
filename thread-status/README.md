[English](README.md) · [Français](README.fr.md)

# `codex-micro-thread-status` plugin

A Claude Code plugin that journals the state of local sessions for the six Agent
keys of the Codex Micro. It writes nothing to the device and reads no transcript.

## What it does

Five hooks — `SessionStart`, `UserPromptSubmit`, `Notification`, `Stop`,
`SessionEnd` — append one NDJSON line to
`~/.claude/thread-status/events.ndjson`. The per-tool-call hooks (`PreToolUse`,
`PostToolUse`) are deliberately absent: they fire dozens of times per turn
without adding anything to a status light.

Each line contains only what carries a transition:

```json
{"ts":1785372299264,"event":"UserPromptSubmit","sessionId":"439b9985-…",
 "cwd":"/Users/…/project","pid":69872,"entrypoint":"claude-desktop",
 "hostSessionId":"local_0c92bab5-…"}
```

No message, no transcript path, no tool input: the journal is publishable as is.

## Trying it without installing anything

```sh
node scripts/thread-status.mjs doctor
```

Then, from the root of the repository:

```sh
claude --plugin-dir ./thread-status
```

`--plugin-dir` loads the plugin for that session only and does not touch
`settings.json`. Then run the companion in another terminal:

```sh
npm run thread-status -- watch
```

## Installing it permanently

The repository is its own marketplace:

```
/plugin install codex-micro-thread-status --marketplace thannous/claude-codex-micro
```

From a local clone, `claude plugin marketplace add /path/to/claude-codex-micro`
then `claude plugin install codex-micro-thread-status@claude-codex-micro`.

A plugin is installed per Claude configuration directory. With several profiles
(`CLAUDE_CONFIG_DIR`), install it in each one whose sessions should report; each
event records the directory it ran under, which is how the companion learns to
list that profile's sessions.

The two watchers are kept running across logins by launchd:

```sh
node scripts/service.mjs install     # writes two agents under ~/Library/LaunchAgents
node scripts/service.mjs status
node scripts/service.mjs uninstall
```

## Without the plugin

Since Claude Code 2.1.322 the roster carries a `status`, and the companion uses
it: keys show working, waiting-for-you and idle with no plugin at all. The plugin
triggers a reconciliation as soon as a hook arrives and distinguishes a
finished turn from an idle prompt. Explicit roster statuses still take
precedence: an early hook cannot contradict a sampled `busy`, `idle` or `waiting`.

## Known bounds

- **The journal is not the source of membership.** `claude -p` sessions and
  subagents emit hooks without appearing in `claude agents --json`; the companion
  arbitrates, not the plugin.
- **`CLAUDE_PLUGIN_DATA` is not used as the state root**: its value changes
  between `--plugin-dir` (`…/data/<name>-inline`) and installation
  (`…/data/<name>`), which would lose the slots.
- **The emitter never writes to stdout.** The output of a `UserPromptSubmit` hook
  is injected into the conversation context.
- **The emitter always exits with code 0.** A status light must never make a
  session fail.

Details of the measurements and of what is still open:
[`docs/research/thread-status-feasibility.md`](../docs/research/thread-status-feasibility.md).
