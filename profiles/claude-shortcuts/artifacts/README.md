# Official Input layer artifact

This directory intentionally does **not** contain a fabricated Work Louder
layer file.

Work Louder Input 0.17.2 exposes official `Import layer` and `Export layer`
commands and uses the `*-layer.json` suffix. Static inspection confirms the
export envelope, but the nested `layer` and `actions` objects must come from a
real Codex Micro export.

To add the first artifact safely:

1. create the Claude layer on a backed-up Codex Micro;
2. test every control and AppSense behavior;
3. use Input's official **Export layer** command;
4. run:

   ```sh
   node scripts/input-layer.mjs sanitize-export \
     --input ~/Downloads/Claude-layer.json \
     --output profiles/claude-shortcuts/artifacts/claude-desktop-macos-layer.json
   ```

5. import the sanitized copy into an isolated configuration;
6. repeat the import to prove idempotence or a clean duplicate refusal;
7. restore the original profile;
8. update `manifest.json` only after all evidence is recorded.

Raw exports and backups stay under `.local/` and must never be committed.
