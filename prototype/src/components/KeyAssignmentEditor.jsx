import { Check, Keyboard } from "lucide-react";
import { JOYSTICK_DIRECTION_COUNTS } from "../../../shared/input-profile.mjs";
import {
  DEFAULT_CUSTOM,
  KEY_SYMBOLS,
  MODIFIERS,
  MODIFIER_SYMBOLS,
  entryFingerprint,
  formatCustomKeys,
  isCustom,
  isCustomJoystick,
} from "../configurator-state.js";
import { FINAL_KEY_OPTIONS } from "../configurator-catalog.jsx";
import {
  controlLabel,
  entryExportLabel,
  entryLabel,
} from "../configurator-presenter.js";
import { JoystickDial } from "./JoystickDial.jsx";

export function KeyAssignmentEditor({
  t,
  selectedControl,
  selectedEntry,
  activeEntry,
  editingJoystickSlot,
  joystickSlot,
  pickerActions,
  duplicateKeyControls,
  customNeedsModifier,
  onSetJoystickMode,
  onSelectJoystickSlot,
  onAssignEntry,
  onToggleModifier,
  onChangeFinalKey,
}) {
  const duplicateControlFor = (entry) => {
    if (
      entry === "none" ||
      (selectedControl.type !== "key" && !editingJoystickSlot)
    ) {
      return null;
    }
    return duplicateKeyControls.get(entryFingerprint(entry)) ?? null;
  };
  const customDuplicateControl = isCustom(activeEntry)
    ? duplicateControlFor(activeEntry)
    : null;

  return (
    <>
      {selectedControl.type === "joystick" && (
        <section className="joystick-editor" aria-label={t("joystick.legend")}>
          <div className="joystick-modes" role="group">
            {["navigation", ...JOYSTICK_DIRECTION_COUNTS, "none"].map((mode) => {
              const active =
                typeof mode === "number"
                  ? isCustomJoystick(selectedEntry) && selectedEntry.directions === mode
                  : selectedEntry === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  className={active ? "is-active" : ""}
                  aria-pressed={active}
                  onClick={() => onSetJoystickMode(mode)}
                >
                  {typeof mode === "number"
                    ? t("joystick.directions", { count: mode })
                    : t(`actions.${mode}.label`)}
                </button>
              );
            })}
          </div>

          {isCustomJoystick(selectedEntry) && (
            <>
              <p className="joystick-hint">{t("joystick.hint")}</p>
              <JoystickDial
                directions={selectedEntry.directions}
                sectors={selectedEntry.sectors}
                selectedIndex={joystickSlot}
                onSelect={onSelectJoystickSlot}
                badgeFor={(sector, index) => ({
                  assigned: sector !== "none",
                  label: sector === "none" ? index + 1 : entryExportLabel(sector),
                  title: entryLabel(sector, t),
                })}
                sectorTitle={t("joystick.sector")}
                closeTitle={t("joystick.closeZone")}
              />
            </>
          )}
        </section>
      )}

      {pickerActions.length > 0 && (
        <section className="action-picker" aria-label={t("dialog.actionTitle")}>
          <div className="action-list">
            {pickerActions.map((action) => {
              const Icon = action.icon;
              const active = !isCustom(activeEntry) && activeEntry === action.id;
              const duplicateControl = duplicateControlFor(action.id);
              return (
                <button
                  key={action.id}
                  type="button"
                  className={active ? "is-active" : ""}
                  aria-pressed={active}
                  onClick={() => onAssignEntry(action.id)}
                >
                  <span className="action-icon">
                    <Icon size={19} />
                  </span>
                  <span className="action-copy">
                    <strong>
                      {t(`actions.${action.id}.label`)}
                      {action.experimental && (
                        <em className="experimental-badge">{t("picker.experimental")}</em>
                      )}
                    </strong>
                    <small>{t(`actions.${action.id}.description`)}</small>
                    {duplicateControl && (
                      <small className="action-duplicate">
                        {t("picker.alreadyOn", {
                          control: controlLabel(duplicateControl, t),
                        })}
                      </small>
                    )}
                  </span>
                  <kbd>{action.shortcut ?? t(`actions.${action.id}.shortcut`)}</kbd>
                  <span className="check-slot" aria-hidden="true">
                    {active && <Check size={18} />}
                  </span>
                </button>
              );
            })}

            {(selectedControl.type === "key" || editingJoystickSlot) && (
              <button
                type="button"
                className={isCustom(activeEntry) ? "is-active" : ""}
                aria-pressed={isCustom(activeEntry)}
                onClick={() => {
                  if (!isCustom(activeEntry)) onAssignEntry(DEFAULT_CUSTOM);
                }}
              >
                <span className="action-icon">
                  <Keyboard size={19} />
                </span>
                <span className="action-copy">
                  <strong>{t("actions.custom.label")}</strong>
                  <small>{t("actions.custom.description")}</small>
                  {customDuplicateControl && (
                    <small className="action-duplicate">
                      {t("picker.alreadyOn", {
                        control: controlLabel(customDuplicateControl, t),
                      })}
                    </small>
                  )}
                </span>
                <kbd>{isCustom(activeEntry) ? formatCustomKeys(activeEntry.keys) : "⌘ …"}</kbd>
                <span className="check-slot" aria-hidden="true">
                  {isCustom(activeEntry) && <Check size={18} />}
                </span>
              </button>
            )}
          </div>

          {isCustom(activeEntry) && (
            <div className="custom-editor">
              <div className="custom-editor-row">
                <span className="custom-editor-label">{t("picker.modifiersLabel")}</span>
                <div className="custom-modifiers">
                  {MODIFIERS.map((modifier) => {
                    const active = activeEntry.keys.slice(0, -1).includes(modifier);
                    return (
                      <button
                        key={modifier}
                        type="button"
                        className={active ? "is-active" : ""}
                        aria-pressed={active}
                        onClick={() => onToggleModifier(modifier)}
                      >
                        {MODIFIER_SYMBOLS[modifier]} {modifier}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="custom-editor-row">
                <label className="custom-editor-label" htmlFor="custom-final-key">
                  {t("picker.keyLabel")}
                </label>
                <select
                  id="custom-final-key"
                  value={activeEntry.keys.at(-1)}
                  onChange={(event) => onChangeFinalKey(event.target.value)}
                >
                  {FINAL_KEY_OPTIONS.map((key) => (
                    <option key={key} value={key}>
                      {KEY_SYMBOLS[key] ? `${KEY_SYMBOLS[key]}  ${key}` : key}
                    </option>
                  ))}
                </select>
              </div>
              {customNeedsModifier && (
                <p className="custom-editor-hint" role="alert">
                  {t("picker.customHint")}
                </p>
              )}
              <p className="custom-editor-note">{t("picker.customSafety")}</p>
            </div>
          )}
        </section>
      )}
    </>
  );
}
