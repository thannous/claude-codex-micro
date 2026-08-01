## Goal

Describe the problem addressed, the solution chosen and the expected result.

## Type of change

Tick what applies. Write `N/A` in the evidence section for validations unrelated
to this PR.

- [ ] Documentation only
- [ ] CLI generator
- [ ] GUI
- [ ] Mapping or preset
- [ ] Backup or restore
- [ ] Work Louder Input import or export
- [ ] Schema or manifest
- [ ] CI or tooling

## Compatibility

- Hardware:
- Work Louder Input:
- Firmware:
- Operating system:
- Target application:

This PR:

- [ ] stays compatible with older profiles;
- [ ] requires a documented migration;
- [ ] changes the manifest format;
- [ ] changes the import or export format;
- [ ] contains another breaking change, described below.

### Breaking change or migration

Describe the impact, the migration procedure and the rollback, or write `None`.

## Common validation

- [ ] `git diff --check` passes.
- [ ] The proof status is accurate.
- [ ] No local identifier, secret or proprietary asset is included.
- [ ] No sensitive action is enabled by default.

## Documentation validation

Required for any documentation change:

- [ ] `node scripts/check-doc-links.mjs` passes.
- [ ] The commands, versions and limits stated match the observed behaviour.
- [ ] Both language versions are updated, or the gap is stated explicitly.

## Functional validation

Required if the PR is not documentation-only:

- [ ] `npm ci --no-audit --no-fund` passes without modifying the lockfile.
- [ ] `npm run check` passes, including the GUI build and tests.
- [ ] No unintended change appears in the generated profiles.
- [ ] The GUI was tested with no unexpected console error or warning, if
      affected.

## Work Louder validation

Required if the PR changes the mapping, the backup, the restore, the import or
the export:

- [ ] The native Codex layer and the other profiles are preserved.
- [ ] The existing AppSense link is preserved.
- [ ] The backup and the rollback are documented and tested.
- [ ] The import into Work Louder Input succeeds.
- [ ] The resulting export can be read back and validated.
- [ ] The behaviour was tested on a physical Codex Micro, or that limit is
      stated explicitly.

## Evidence and limits

State how far the change was verified:

- Schema and validators:
- Generator:
- GUI:
- Generated profile:
- Work Louder Input:
- Physical Codex Micro:

Attach the commands run, the results observed and what remains unverified. A
successful build or a valid JSON is not, on its own, proof of import or of
hardware behaviour.
