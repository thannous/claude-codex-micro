[English](feasibility.md) · [Français](feasibility.fr.md)

# BLE feasibility on the Codex Micro

## Current verdict

Feasibility is **open but not demonstrated**.

The Codex Micro has an active BLE HID link and Work Louder documents BLE
channels. Hardware Buddy, however, expects a GATT device that advertises a
`Claude…` name, exposes the Nordic UART Service and handles JSON lines. None of
those has been observed on the Codex Micro.

## Evidence matrix

| Gate | State | Proof or action required |
| --- | --- | --- |
| BLE connection available | Yes, HID layer | macOS I/O registry and Work Louder documentation |
| Keyboard usable over HID | Yes, visible to macOS | active Work Louder HID device |
| Advertised name starting with `Claude` | Not observed | the observed HID name is `Codex Micro #1` |
| Nordic UART Service | Unknown | targeted GATT scan, after agreement |
| Identifiable firmware | Unknown | version/export from the Work Louder tool |
| Modifiable firmware | Unknown | documentation, sources or SDK for the exact model |
| Programming and recovery mode | Unknown | verified vendor procedure |
| HID + NUS coexistence | Unknown | restorable prototype and hardware test |
| Claude developer mode | Not verified | manual activation, after agreement |
| Heartbeat exchange | Not tested | isolated test with no permission command |
| Safe permission decision | Not tested | security review and explicit test |

## Possible paths

### A. Extending the Codex Micro firmware

This path is only acceptable if the exact model's firmware is documented,
backup-able and restorable:

1. keep the HID service and every mapping;
2. add the Nordic UART Service;
3. advertise a Claude-compatible name;
4. handle JSON lines in a bounded queue;
5. reserve permission decisions for a deliberate physical gesture.

This path is suspended: no evidence of extensible firmware exists.

### B. Separate BLE companion

A separate BLE microcontroller can implement Hardware Buddy while the Codex Micro
stays a shortcut keyboard. This path reduces the risk of making the keyboard
unusable and protects the existing layers, but it is not a Codex Micro firmware
integration.

### C. HID shortcuts only

This is the first deliverable and the only path documented as immediately
plausible. It does not require the Hardware Buddy protocol and can be tested key
by key after inventory, backup and authorisation.

## Next useful piece of evidence

Before any scan, pairing or flash, the following must be identified:

1. the exact model and revision of the Codex Micro;
2. the firmware and configurator currently in use;
3. the six existing layers and AppSense links;
4. whether an export or a recovery image exists;
5. whether a separate companion is acceptable if the firmware is closed.

## Sources

- [Work Louder — Bluetooth, layers and AppSense](https://worklouder.cc/openai-micro-setup)
- [Anthropic — Hardware Buddy BLE Protocol](https://github.com/anthropics/claude-desktop-buddy/blob/main/REFERENCE.md)
- [Anthropic — ESP32 example firmware](https://github.com/anthropics/claude-desktop-buddy)
