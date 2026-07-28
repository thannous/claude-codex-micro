# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

The repository-level command `npm run configure` is the canonical entry point for end users. It must prepare missing GUI dependencies, start the local prototype, and open it in the browser.

The default Claude mapping uses `Cmd+N` for a new session, user-confirmed `Cmd+D` for in-app voice, `Cmd+Shift+D` for the diff pane, and `Esc` to stop a response. Quick Entry (`double Option`) and its global dictation shortcut (`Caps Lock`) remain separate from the AppSense layer.

The logical Claude V0 JSON remains `proposal-not-applied`. The GUI may generate a genuinely importable, personal Work Louder Input profile only from the user's own official Codex Micro backup. Validate the backup, preserve the native layer, other layers, and AppSense link, and create a separate `Claude macOS` profile. Never present that generated file as a universal public preset or a live agent integration.

Keep the GUI focused on the user's primary job: select a physical control, assign a Claude action, review the mapping, and export it. Preserve the warm glass visual direction of the original single-screen configurator. Safety and proof-level caveats should stay concise and contextual; do not turn the interface into a compliance journey or a documentation dashboard.
