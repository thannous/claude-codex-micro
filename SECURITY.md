[English](SECURITY.md) · [Français](SECURITY.fr.md)

# Security

## Status

The repository is public, but the project stays experimental and does not yet
have a supported version or a private reporting channel. Never publish a secret,
a personal profile, or any detail that would make a vulnerability exploitable.
With no private channel available, open only a minimal report asking for a
confidential contact method.

## Risk model

### HID shortcuts

A key can send, delete or trigger an action in the wrong application. The default
profile excludes `Enter` and every permission decision. Tests must use a
low-stakes context and start with a single low-risk action.

### AppSense and focus

Faulty detection can activate the wrong layer. You have to check:

- the detected application;
- the active layer before each test;
- the behaviour after focus loss;
- conflicts with existing links.

Never fix a conflict by resetting all settings.

### BLE Hardware Buddy

The protocol makes it possible to receive session information and to answer a
permission request. A faulty implementation could expose conversation excerpts or
approve an action unintentionally.

Until the track is audited:

- no automatic approval or decision;
- no prompt identifier retained;
- no log containing an address, token or pairing code;
- no flashable firmware distributed;
- no pairing presented as supported;
- return to a neutral state after a connection loss.

## Data not to collect

- Bluetooth address or unique hardware identifier;
- serial number;
- pairing code;
- the content of Claude conversations;
- token, API key or local secret;
- a full settings capture containing personal data.

## Dependencies and scripts

The project does not transmit Work Louder profiles or exports to a remote
service. The configurator, the generator and the validators process them locally,
with no application telemetry.

A network connection may however be used by `npm ci --no-audit --no-fund` to
download, from the configured registry, the versions locked in
`package-lock.json`. On their first run, `npm run configure` and `npm run check`
may likewise run `npm ci --ignore-scripts` in `prototype/` if the GUI
dependencies are missing. Once installed, profile processing stays local. Any new
dependency or remote communication must be justified, locked, documented and
audited before publication.

## Backup and restore

The primary rollback remains importing the original official profile into Input.
Restoring the storage raw is secondary and requires several explicit
confirmations. Its destination must match exactly a detected Input path or
`WORK_LOUDER_INPUT_USER_DATA`. The tool refuses the system root, the home folder,
the repository, symbolic links, and any unapproved folder.
