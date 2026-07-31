[English](publishing-checklist.md) · [Français](fr/publishing-checklist.md)

# Publishing checklist

Making the repository public and publishing an installable preset are two
distinct decisions. A proposal can be useful and automatically tested without
being presented as a validated hardware layer.

## Public repository — done

- [x] MIT licence and copyright 2026 Thanh Chau.
- [x] No affiliation with Work Louder or Anthropic.
- [x] No firmware, proprietary asset or raw user export.
- [x] `main` as the default branch.
- [x] GitHub contribution templates.

## Checks that apply to every contribution

- [ ] `npm run check` passes.
- [ ] `npm ci --no-audit --no-fund` uses the lockfile without changing the tree.
- [ ] `git diff --check` passes.
- [ ] External sources verified by hand.
- [ ] Exact level of proof in the manifest and the README.
- [ ] Native layer at index `0` explicitly protected.
- [ ] No send, permission, deletion, push, deployment or destructive command
  mapped by default.
- [ ] BLE still marked as unproven without GATT and firmware evidence.

## Privacy

- [ ] No secret, token, key or account identifier.
- [ ] No Bluetooth address, serial number, port or hardware identifier.
- [ ] No absolute user path.
- [ ] No screenshot or log containing personal data.
- [ ] `.local/`, `work/` and `outputs/` ignored by Git.
- [ ] Every `*-layer.json` run through `sanitize-export` and reviewed by hand.

## Gates for the Claude V1 preset

- [x] Official layer and profile Import/Export flows identified in Input
  `0.17.2`.
- [x] Manifest, mapping, schemas and visual representation publishable.
- [x] Backup, SHA-256 verification, dry run, single selection and rollback
  tested on isolated copies.
- [x] Real local configuration inventoried without publishing the AppSense
  values.
- [x] Official export of the original profile kept out of Git.
- [x] Single Claude layer confirmed; index `0` compared before and after.
- [x] Input `0.17.3` profile generated locally with AppSense preserved.
- [ ] Physical positions and Input identifiers verified.
- [ ] AppSense, keys, dial, joystick and focus loss tested.
- [ ] Persistence after an Input restart verified.
- [ ] Real `*-layer.json` exported, sanitised and added with its SHA-256 sum.
- [ ] Declared SHA-256 identical and content matching the canonical mapping.
- [ ] Import into an isolated configuration and a second import tested.
- [ ] Original profile re-imported and device verified.
- [ ] Compatibility matrix updated with the results.

As long as the hardware boxes stay open, the preset keeps the
`hardware-observed` status and cannot be presented as fully validated.
