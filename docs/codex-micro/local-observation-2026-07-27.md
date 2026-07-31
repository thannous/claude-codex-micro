[English](local-observation-2026-07-27.md) · [Français](../fr/codex-micro/local-observation-2026-07-27.md)

# Local observation — 27 July 2026

Read-only reconnaissance carried out during the previous initialisation, without
opening system settings and without modifying Claude or the device.

## Environment observed

- macOS `26.5.2` (`25F84`), Apple Silicon `arm64`;
- Claude Desktop present in `/Applications/Claude.app`;
- bundle `com.anthropic.claudefordesktop`;
- Claude version `1.24012.9`;
- Work Louder Input `0.17.2`;
- Codex Micro firmware `v0.4.1`, seen in Input's Setup screen.

## Codex Micro observed

The macOS I/O registry exposed an active HID device with:

- product `Codex Micro #1`;
- manufacturer `Work Louder`;
- transport `Bluetooth Low Energy`;
- Vendor ID `12346`;
- Product ID `33632`;
- VersionNumber `24193`.

Unique identifiers, the Bluetooth address and the serial number are deliberately
excluded.

## What this observation proves

- the Codex Micro is visible to macOS;
- a BLE HID connection is available;
- the keyboard can in principle emit standard shortcuts;
- the Input/firmware combination observed is `0.17.2` / `v0.4.1`.

## What it does not prove

- the exact commercial revision of the hardware;
- whether the firmware is modifiable or publicly redistributable;
- the presence of the Nordic UART Service that Claude expects;
- the ability to advertise a name starting with `Claude`;
- HID + Hardware Buddy coexistence;
- enabling Claude's developer mode;
- an actual exchange of Hardware Buddy messages.

`system_profiler` did not list the device during the reconnaissance. The evidence
came from the HID I/O registry. No active GATT scan was run.
