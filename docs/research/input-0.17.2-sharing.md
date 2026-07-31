[English](input-0.17.2-sharing.md) · [Français](../fr/research/input-0.17.2-sharing.md)

# Work Louder Input 0.17.2 — observed sharing mechanism

## Verdict

Input `0.17.2` has an official user flow for importing and exporting at both the
**layer** and **profile** level. The files it produces carry the `*-layer.json`
and `*-profile.json` suffixes respectively.

That justifies preferring the official import/export over patching the local
database directly. The repository, however, does not publish a Codex Micro layer
file yet: no real export has been captured and re-imported on hardware. The
status therefore stays `proposal-not-applied`.

## Verified facts

### Work Louder documentation

The official Codex Micro page states:

- six programmable layers at most;
- an AppSense link created with the link icon, `Auto detect`, then five seconds
  of focus on the target application;
- `Reset settings` deletes layers, profiles and actions.

Source: <https://worklouder.cc/openai-micro-setup>

### Distributed application

The official archive inspected is:

```text
https://github.com/worklouder/input-releases/releases/download/v0.17.2/input-0.17.2-arm64-mac.zip
```

Identity observed:

- SHA-256 of the archive:
  `72bb2ccd2f0de0b21a61cd4006367a64e628010c3e7303e94f219cff5ad45d35`;
- macOS bundle: `it.focusense.input-app`;
- short version and build: `0.17.2`;
- Electron package: `input` `0.17.2`.

The sanitised static analysis of the bundle exposes the following labels:

- `Import layer`;
- `Export layer`;
- `Import Profile`;
- `Export Profile`;
- a different-language warning;
- refusal of a file created for another keyboard type.

The JSON envelope of a layer export contains the top-level keys:

```text
keyboard
language
layer
actions
multiactions
smartActions
actionGroups
multiactionGroups
smartActionGroups
```

The profile export replaces `layer` with `profile`. The packaged code uses
`JSON.stringify`, `Blob` and `URL.createObjectURL` for the export, then
`FileReader`, `JSON.parse` and a structured clone for the import.

## Reproducible method

The following workflows temporarily download the official archive, extract
`app.asar`, compute structural metadata only, then delete the proprietary files:

- `.github/workflows/inspect-input-0172.yml`;
- `.github/workflows/inspect-input-0172-ast.yml`.

The CI artefacts contain only: versions, checksums, bounded labels, key names,
suffixes and AST summaries. They contain no packaged source code, no image, no
firmware and no local identifier.

## Initial architecture decision

This inspection had led to the following initial plan:

1. back up through the official profile export **and** a copy of the recognised
   local configuration;
2. inventory from the official `*-profile.json`;
3. select the first free slot after the protected index `0`;
4. import the official `*-layer.json` once a real artefact has been verified;
5. a manual guided procedure as long as that artefact is missing;
6. primary rollback by re-importing the original official profile;
7. no direct patching of `input_storage.json`, Local Storage or the device
   before further proof.

This plan is kept as history, but it is no longer the current V1 path. Today's V1
transforms an Input `0.17.3` `*-profile.json` export locally, one that contains
exactly one `Claude` layer already linked with AppSense. The layer import remains
an optional publication validation.

## Points not yet proven

- the complete internal structure of the `layer` and `actions` objects for the
  Codex Micro;
- the physical identifiers Input displays for each key;
- creating then importing the Claude layer on the real device;
- persistence after an Input restart;
- returning to the previous layer on focus loss;
- effective restoration of the hardware keymap by re-importing a profile;
- the behaviour of a second import of the same layer.

A real `*-layer.json` file must only be added after the tests described in
`profiles/claude-shortcuts/artifacts/README.md`.
