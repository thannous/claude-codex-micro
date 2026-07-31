import { Keyboard, Move } from "lucide-react";
import { ACTIONS } from "./configurator-catalog.jsx";
import {
  formatCustomKeys,
  isCustom,
  isCustomJoystick,
} from "./configurator-state.js";

function actionFor(entry) {
  return Object.hasOwn(ACTIONS, entry) ? ACTIONS[entry] : ACTIONS.none;
}

export function entryFor(mapping, controlId) {
  return mapping[controlId] ?? "none";
}

export function entryExportLabel(entry) {
  if (isCustomJoystick(entry)) return `${entry.directions} DIR`;
  if (isCustom(entry)) return formatCustomKeys(entry.keys);
  return actionFor(entry).exportLabel;
}

export function entryLabel(entry, t) {
  if (isCustomJoystick(entry)) return t("actions.joystickCustom.label");
  if (isCustom(entry)) return t("actions.custom.label");
  return t(`actions.${actionFor(entry).id}.label`);
}

export function entryIcon(entry) {
  if (isCustomJoystick(entry)) return Move;
  if (isCustom(entry)) return Keyboard;
  return actionFor(entry).icon;
}

export function entryShortcut(entry, t) {
  if (isCustomJoystick(entry)) {
    return t("actions.joystickCustom.shortcut", { count: entry.directions });
  }
  if (isCustom(entry)) return formatCustomKeys(entry.keys);
  const action = actionFor(entry);
  return action.shortcut ?? t(`actions.${action.id}.shortcut`);
}

export function controlLabel(control, t) {
  return t(`controls.${control.id}`);
}

export function controlBadgeLabel(control, entry) {
  return entry === "none" ? control.shortLabel : entryExportLabel(entry);
}
