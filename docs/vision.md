[English](vision.md) · [Français](fr/vision.md)

# Project vision

## Problem

Work Louder Input lets you customise the Codex Micro, but a useful configuration
stays hard to pass on: it depends on the Input version, the firmware, the layers
already present, and the way the application identifies software with AppSense.

A screenshot or a list of shortcuts is not enough. A shareable preset also has to
explain its compatibility, preserve what is already there, prove its level of
validation, and offer a way back.

## Goal

Build a community library of Codex Micro configurations that are
understandable, testable and — where the format allows it — installable.

The target journey is:

1. pick a preset for an application or a workflow;
2. check hardware and software compatibility;
3. back up the current Input configuration;
4. simulate or inspect the change;
5. install or reproduce only the layer that was asked for;
6. verify every control;
7. restore the backup if anything goes wrong.

## First reference case

Claude Desktop on macOS serves as the first complete case:

- automatic layer activation with AppSense;
- common, reversible shortcuts;
- wheel for scrolling;
- joystick for navigation;
- sending, permissions and destructive actions excluded by default; the personal
  GUI may offer sending only on an explicit choice.

This first preset has to set the conventions that future IDE, browser, graphics
or specialised-workflow layers can reuse.

## Principles

### Preserve the native keyboard

The Codex layer shipped with the hardware stays intact. A community preset uses
a free slot, or asks for an explicit decision before any replacement.

### Publish the level of proof

Every artefact carries a status:

- `proposal-not-applied`: specification only;
- `hardware-observed`: environment inventoried;
- `manually-validated`: mapping tested on the declared hardware;
- `export-format-verified`: installation and restore reproduced.

### Minimise writes

An installation tool must offer a dry run, back up before writing, and apply a
targeted delta. It must never depend on Reset Settings.

### Protect privacy

User paths, ports, serial numbers, Bluetooth addresses, private screenshots and
full exports stay out of the repository.

### Keep consequential actions out

Public presets do not include, by default, sending a message, approving a
permission, a deletion, a push or a deployment.

## Out of scope

The project does not redistribute Work Louder firmware, does not promise
untested compatibility, and does not present the BLE Hardware Buddy track as
working without reproducible proof.
