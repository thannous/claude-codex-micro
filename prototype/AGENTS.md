# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

The repository-level command `npm run configure` is the canonical entry point for end users. It must prepare missing GUI dependencies, start the local prototype, and open it in the browser.

The default Claude mapping uses `Cmd+N` for a new session, user-confirmed `Cmd+D` for in-app voice, `Cmd+Shift+D` for the diff pane, and `Esc` to stop a response. Quick Entry (`double Option`) and its global dictation shortcut (`Caps Lock`) remain separate from the AppSense layer.

The logical Claude V0 JSON remains `proposal-not-applied`. The GUI may generate a genuinely importable, personal Work Louder Input profile only from the user's own official Codex Micro backup. Validate the backup, preserve the native layer, other layers, and AppSense link, and create a separate `Claude macOS` profile. Never present that generated file as a universal public preset or a live agent integration.

Keep the GUI focused on the user's primary job: select a physical control, assign a Claude action, review the mapping, and export it. Preserve the warm glass visual direction of the original single-screen configurator. Safety and proof-level caveats should stay concise and contextual; do not turn the interface into a compliance journey or a documentation dashboard.

Expose all 13 physical switches (including the encoder press), the encoder rotation, and the joystick as configurable controls. Reserve only the touch sensor used to change layers. Keep a broad Claude Desktop shortcut catalogue alongside the safe custom-combination editor.

Treat the photographed top-left metal control as the rotary encoder: it turns counterclockwise/clockwise and can be pressed. Treat the top-right black control as a directional joystick with no press action. Keep those positions and capabilities explicit in the overlay, accessible labels, generated-profile documentation, and reference diagrams.

Offer Claude effort as a wheel-rotation mode, not a joystick mode: one detent moves to the previous or next available effort level. Keep the joystick free for directional navigation or no action.

Claude Desktop also exposes Return to send and Option+Command+Return to send in a duplicated session. Offer them only as explicit built-in catalogue actions; keep Return and Enter unavailable in the custom-combination editor and excluded from the public default preset. Use the orange Claude mark for Send, a duplication icon for the duplicated-session action, and keep keycap badges low enough that they never cover the action icon.

Keep the configurator hero visually stripped back: do not place an eyebrow or a large marketing headline above the device. Retain only the concise instructional subtitle.

Keep that remaining instructional subtitle visually prominent rather than caption-sized: use a clearly readable display-support size on desktop and a comfortably larger body size on mobile.
