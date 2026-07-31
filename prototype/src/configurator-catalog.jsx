import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  ChevronsLeft,
  ChevronsRight,
  Command,
  CopyPlus,
  Diff,
  Gauge,
  Mic,
  Minus,
  Monitor,
  MousePointer2,
  Move,
  RotateCw,
  Search,
  Settings,
  SlidersHorizontal,
  Square,
  Volume2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { FINAL_KEYCODES } from "../../shared/input-profile.mjs";
import { assertKeyActionCatalog } from "./configurator-state.js";

export const GUIDE_URL =
  "https://github.com/thannous/claude-codex-micro/blob/main/docs/installation.md";
export const INPUT_RELEASES_URL =
  "https://github.com/worklouder/input-releases/releases";

export function ClaudeMarkIcon({ size = 19, className = "" }) {
  return (
    <img
      className={`claude-mark-icon${className ? ` ${className}` : ""}`}
      src="/assets/claude-mark.svg"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable="false"
    />
  );
}

export const CONTROLS = Object.freeze([
  {
    id: "wheel",
    // The control's identity, not a mode: the wheel is no longer on scroll by
    // default. Shown only when no action is assigned.
    shortLabel: "DIAL",
    type: "dial",
    x: 9.36,
    y: 9.48,
    w: 19.6,
    h: 19.95,
  },
  {
    id: "key-13",
    shortLabel: "PRESS",
    type: "key",
    className: "key-hotspot--encoder-button",
    x: 13.93,
    y: 14.17,
    w: 10.61,
    h: 10.56,
  },
  {
    id: "key-9",
    shortLabel: "A1",
    type: "key",
    x: 29.84,
    y: 9.92,
    w: 20.19,
    h: 18.63,
  },
  {
    id: "key-10",
    shortLabel: "A2",
    type: "key",
    x: 50.77,
    y: 9.92,
    w: 20.19,
    h: 18.63,
  },
  {
    id: "joystick",
    shortLabel: "NAV",
    type: "joystick",
    x: 73.31,
    y: 10.06,
    w: 17.98,
    h: 19.36,
  },
  { id: "key-5", shortLabel: "A3", type: "key", x: 8.77, y: 31.18, w: 20.19, h: 18.63 },
  { id: "key-6", shortLabel: "A4", type: "key", x: 28.81, y: 31.18, w: 20.19, h: 18.63 },
  { id: "key-7", shortLabel: "A5", type: "key", x: 51.06, y: 31.18, w: 20.19, h: 18.63 },
  { id: "key-8", shortLabel: "A6", type: "key", x: 72.13, y: 31.18, w: 20.19, h: 18.63 },
  { id: "key-1", shortLabel: "C1", type: "key", x: 8.77, y: 53.04, w: 20.19, h: 18.63 },
  { id: "key-2", shortLabel: "C2", type: "key", x: 28.81, y: 53.04, w: 20.19, h: 18.63 },
  { id: "key-3", shortLabel: "C3", type: "key", x: 51.06, y: 53.04, w: 20.19, h: 18.63 },
  { id: "key-4", shortLabel: "C4", type: "key", x: 72.13, y: 53.04, w: 20.19, h: 18.63 },
  { id: "key-11", shortLabel: "C5", type: "key", x: 28.81, y: 74.3, w: 42.44, h: 18.63 },
  { id: "key-12", shortLabel: "C6", type: "key", x: 72.13, y: 74.3, w: 20.19, h: 18.63 },
].map(Object.freeze));

export const CONTROL_BY_ID = new Map(
  CONTROLS.map((control) => [control.id, control]),
);

export const RESERVED_ZONES = Object.freeze([
  Object.freeze({ id: "sensor", x: 8.77, y: 74.3, w: 20.19, h: 18.63, round: true }),
]);

export const KEYCAP_TONES = Object.freeze({
  "key-9": "186 235 211",
  "key-10": "250 218 166",
  "key-5": "205 187 244",
  "key-6": "215 216 240",
  "key-7": "187 201 241",
  "key-8": "242 181 213",
  "key-1": "235 233 230",
  "key-2": "235 233 230",
  "key-3": "231 232 236",
  "key-4": "235 233 230",
  "key-11": "235 233 230",
  "key-12": "235 233 230",
  "key-13": "38 36 34",
});

const actions = {
  navigation: {
    id: "navigation",
    shortcut: "↑  →  ↓  ←",
    icon: Move,
    controlTypes: ["joystick"],
    exportLabel: "NAV",
  },
  scroll: {
    id: "scroll",
    shortcut: "Page ↑  Page ↓",
    icon: MousePointer2,
    controlTypes: ["dial"],
    exportLabel: "SCROLL",
  },
  lines: {
    id: "lines",
    shortcut: "↑  ↓",
    icon: ArrowDownUp,
    controlTypes: ["dial"],
    exportLabel: "LINES",
  },
  effort: {
    id: "effort",
    shortcut: "⌘ ⇧ E · ← / →",
    icon: SlidersHorizontal,
    controlTypes: ["dial"],
    exportLabel: "EFFORT",
  },
  volume: {
    id: "volume",
    shortcut: "Vol − +",
    icon: Volume2,
    controlTypes: ["dial"],
    exportLabel: "VOL",
    experimental: true,
  },
  newSession: {
    id: "newSession",
    shortcut: "⌘ N",
    icon: Command,
    controlTypes: ["key"],
    exportLabel: "NEW",
  },
  send: {
    id: "send",
    shortcut: "↩",
    icon: ClaudeMarkIcon,
    controlTypes: ["key"],
    exportLabel: "SEND",
  },
  sendInDuplicateSession: {
    id: "sendInDuplicateSession",
    shortcut: "⌥ ⌘ ↩",
    icon: CopyPlus,
    controlTypes: ["key"],
    exportLabel: "DUP",
  },
  voice: {
    id: "voice",
    shortcut: "⌘ D",
    icon: Mic,
    controlTypes: ["key"],
    exportLabel: "VOICE",
  },
  diff: {
    id: "diff",
    shortcut: "⌘ ⇧ D",
    icon: Diff,
    controlTypes: ["key"],
    exportLabel: "DIFF",
  },
  // Claude Desktop exposes cycling, not rank-based session selection.
  nextSession: {
    id: "nextSession",
    shortcut: "⌃ ⇥",
    icon: ChevronsRight,
    controlTypes: ["key"],
    exportLabel: "NEXT",
  },
  previousSession: {
    id: "previousSession",
    shortcut: "⌃ ⇧ ⇥",
    icon: ChevronsLeft,
    controlTypes: ["key"],
    exportLabel: "PREV",
  },
  effortMenu: {
    id: "effortMenu",
    shortcut: "⌘ ⇧ E",
    icon: Gauge,
    controlTypes: ["key"],
    exportLabel: "EFF",
  },
  stop: {
    id: "stop",
    shortcut: "Esc",
    icon: Square,
    controlTypes: ["key"],
    exportLabel: "ESC",
  },
  settings: {
    id: "settings",
    shortcut: "⌘ ,",
    icon: Settings,
    controlTypes: ["key"],
    exportLabel: "SET",
  },
  find: {
    id: "find",
    shortcut: "⌘ F",
    icon: Search,
    controlTypes: ["key"],
    exportLabel: "FIND",
  },
  findNext: {
    id: "findNext",
    shortcut: "⌘ G",
    icon: Search,
    controlTypes: ["key"],
    exportLabel: "NEXT",
  },
  findPrevious: {
    id: "findPrevious",
    shortcut: "⌘ ⇧ G",
    icon: Search,
    controlTypes: ["key"],
    exportLabel: "PREV",
  },
  back: {
    id: "back",
    shortcut: "⌘ [",
    icon: ArrowLeft,
    controlTypes: ["key"],
    exportLabel: "BACK",
  },
  forward: {
    id: "forward",
    shortcut: "⌘ ]",
    icon: ArrowRight,
    controlTypes: ["key"],
    exportLabel: "FWD",
  },
  reload: {
    id: "reload",
    shortcut: "⌘ R",
    icon: RotateCw,
    controlTypes: ["key"],
    exportLabel: "LOAD",
  },
  closeWindow: {
    id: "closeWindow",
    shortcut: "⌘ W",
    icon: X,
    controlTypes: ["key"],
    exportLabel: "CLOSE",
  },
  zoomIn: {
    id: "zoomIn",
    shortcut: "⌘ +",
    icon: ZoomIn,
    controlTypes: ["key"],
    exportLabel: "ZOOM+",
  },
  zoomOut: {
    id: "zoomOut",
    shortcut: "⌘ −",
    icon: ZoomOut,
    controlTypes: ["key"],
    exportLabel: "ZOOM−",
  },
  resetZoom: {
    id: "resetZoom",
    shortcut: "⌘ 0",
    icon: Monitor,
    controlTypes: ["key"],
    exportLabel: "100%",
  },
  none: {
    id: "none",
    shortcut: null,
    icon: Minus,
    controlTypes: ["key", "dial", "joystick"],
    exportLabel: "NONE",
  },
};

for (const action of Object.values(actions)) {
  Object.freeze(action.controlTypes);
  Object.freeze(action);
}

export const ACTIONS = Object.freeze(actions);
assertKeyActionCatalog(ACTIONS);

const actionsByControlType = { key: [], dial: [], joystick: [] };
for (const action of Object.values(ACTIONS)) {
  for (const controlType of action.controlTypes) {
    actionsByControlType[controlType].push(action);
  }
}
for (const groupedActions of Object.values(actionsByControlType)) {
  Object.freeze(groupedActions);
}

export const ACTIONS_BY_CONTROL_TYPE = Object.freeze(actionsByControlType);
export const FINAL_KEY_OPTIONS = Object.freeze(Object.keys(FINAL_KEYCODES));
