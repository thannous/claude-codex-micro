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

Two options, either one:

- copy `hooks/hooks.json` into the `hooks` key of `~/.claude/settings.json`,
  replacing `$CLAUDE_PLUGIN_ROOT` with the absolute path of this directory;
- publish this directory as a plugin and install it from a marketplace, which
  keeps `$CLAUDE_PLUGIN_ROOT` and versioned updates.

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
