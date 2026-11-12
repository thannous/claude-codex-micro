# Input 1.1.0 profile round-trip

Captured on 12 November 2026 with the official Input `1.1.0` application and
Codex Micro firmware `0.6.3`.

`source-profile.json` is a real profile export after creating one empty Claude
layer and linking it to Claude in Input. The repository generated the shortcuts,
Effort wheel and navigation joystick; `enable-agent-keys.mjs` then assigned the
six Agent codes. That profile was imported through Input's native **Import
Profile**, then exported again as `roundtrip-profile.json`.

Profile ids/names and the local AppSense id were replaced with fixed fixture
values. The native layer was not changed. Its SHA-256 is
`07eaffb11c3bb91ffe3f3f12aff90a6564c14410d2b5b61bfac21b7d64085493`, calculated
over compact JSON with recursively sorted object keys and unchanged array order.
The test also compares its complete object and checks the recovered logical
mapping after Input renumbers action ids.

This proves the profile transformation and native-layer preservation. It is not
a physical shortcut test or an isolated import/export of a standalone layer.
Raw exports and recovery copies stay in ignored project outputs.
