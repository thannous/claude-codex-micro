[English](README.md) · [Français](README.fr.md)

# BLE Hardware Buddy track

This track studies a richer integration: session states, pending permissions and
Claude events forwarded to a BLE device.

## Status

**Experimental and not working on the Codex Micro at this stage.**

Anthropic's
[`claude-desktop-buddy`](https://github.com/anthropics/claude-desktop-buddy)
project publishes an ESP32 example and the BLE protocol. Its own README states
that the API:

- requires Claude Desktop's developer mode;
- is aimed at makers and developers;
- is not an officially supported product feature.

The Codex Micro is already a BLE HID device. That does not prove it exposes the
Nordic UART service, that its firmware is modifiable, or that HID and NUS can
coexist.

See:

- [reference protocol](protocol.md);
- [Codex Micro feasibility](feasibility.md);
- [non-executable messages](messages.example.ndjson).

The directory deliberately contains no firmware, no flashing command and no
pairing tool.
