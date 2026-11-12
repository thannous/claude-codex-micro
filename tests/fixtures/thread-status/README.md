# Recorded Claude Code sessions

Ground truth for `tests/thread-replay.test.mjs`. Each recording is two files on
one clock, in milliseconds from the first sample:

- `*.roster.ndjson` — the `status` of the session in `claude agents --json`,
  sampled about every 275 ms (`null` while the session is not listed);
- `*.journal.ndjson` — what the `thread-status` plugin's hooks emitted.

| Recording | Claude Code | What happens |
| --- | --- | --- |
| `turns-and-interrupt` | 2.1.322 | eleven answered turns, one turn interrupted with Esc (no `Stop`), a 60-second `idle_prompt`, then `/exit` |
| `permission-prompt` | 2.1.322, `--permission-mode default` | one answered turn, then a Bash command that raises a permission prompt, approved after 15 seconds |
| `installed-plugin-20261112` | 2.1.322, user-installed plugin, no `--plugin-dir` | eleven answered turns, one interrupted turn without `Stop`, an `idle_prompt`, then `/exit`; the Bash command was automatically approved, so this recording contains no permission wait |

They are sanitised: paths, names, pids and the real session id are removed; only
timing and the fields that carry a transition are kept.

## Recording a new one

`record.py` drives a real interactive session through a pty and writes the raw
pair. `--installed-plugin` checks the installed plugin instead of loading the
repository directly. It spends a few cents of model usage. It can be run from inside another
Claude Code session: it strips the identity a parent session passes on, without
which the child is not listed in the roster.

```sh
mkdir -p outputs/thread-recording/work outputs/thread-recording/state
python3 tests/fixtures/thread-status/record.py "$PWD" "$PWD/outputs/thread-recording/work" "$PWD/outputs/thread-recording/state" "$PWD/outputs/thread-recording" turns --installed-plugin
```

Register the output campaign with Storage Guard first. Use a new output
directory for a `permission` run so the first recording remains intact. The
12 November installed run timestamps roster results after the command returns;
the two earlier recordings retain their original timestamps. Its first listed
sample had no `status` field; the fixture preserves that absence.

In the `turns` scenario the Bash step only raises a prompt if the profile's
default permission mode asks; the `permission` scenario forces it.

Re-record after a Claude Code update that changes hook timing or the roster's
`status` values, and keep the old recording beside the new one if the reducer
must still handle both.
