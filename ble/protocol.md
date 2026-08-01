[English](protocol.md) · [Français](protocol.fr.md)

# Claude Hardware Buddy protocol

This note summarises Anthropic's
[public protocol](https://github.com/anthropics/claude-desktop-buddy/blob/main/REFERENCE.md).
It does not prove that the Codex Micro implements it.

## Transport

The device must advertise a name starting with `Claude` and expose the Nordic
UART Service:

| Role | UUID |
| --- | --- |
| Service | `6e400001-b5a3-f393-e0a9-e50e24dcca9e` |
| RX, desktop → device | `6e400002-b5a3-f393-e0a9-e50e24dcca9e` |
| TX, device → desktop | `6e400003-b5a3-f393-e0a9-e50e24dcca9e` |

Messages are UTF-8 JSON objects, one object per line terminated by `\n`. The
device must reassemble lines fragmented at the MTU boundary.

## State and events

Claude sends a snapshot on any change, and a keepalive every 10 seconds. It can
contain, among other things:

```json
{
  "total": 3,
  "running": 1,
  "waiting": 1,
  "tokens_today": 31200,
  "prompt": {
    "id": "req_abc",
    "tool": "Bash"
  }
}
```

No snapshot for roughly 30 seconds must be treated as a connection loss.

The end of a turn can also produce a one-off event:

```json
{"evt":"turn","role":"assistant","content":[]}
```

Serialised events larger than 4 KiB are dropped by the desktop.

## Permission decisions

When `prompt` is present, the protocol allows:

```json
{"cmd":"permission","id":"req_abc","decision":"once"}
```

or:

```json
{"cmd":"permission","id":"req_abc","decision":"deny"}
```

These messages are not an implementation recommendation. The initial shortcut
profile excludes every permission decision. A future integration should at
minimum require a deliberate physical gesture, check the identifier strictly, and
return to a neutral state on disconnect.

## Enabling it on the Claude side

The bridge is disabled by default. Anthropic's procedure goes through developer
mode, the Hardware Buddy window and a macOS Bluetooth permission. It would modify
Claude/macOS settings and has not been carried out.

## Limit

The protocol is aimed at makers and is not an officially supported product
feature. It can evolve independently of the Codex Micro and of Work Louder Input.
