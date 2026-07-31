import { lazy, Suspense } from "react";
import { ArrowDownToLine, ChevronRight, RotateCcw, X } from "lucide-react";
import { controlLabel, entryLabel, entryShortcut } from "../configurator-presenter.js";
import { loadProfileExportPanel } from "../profile-panel-loader.js";
import { KeyAssignmentEditor } from "./KeyAssignmentEditor.jsx";

const ProfileExportPanel = lazy(() =>
  loadProfileExportPanel().then((module) => ({ default: module.ProfileExportPanel })),
);

export function MappingDialog({
  t,
  refs,
  panelOpen,
  panelMode,
  selectedControl,
  selectedEntry,
  activeEntry,
  editingJoystickSlot,
  joystickSlot,
  pickerActions,
  duplicateKeyControls,
  customNeedsModifier,
  profile,
  onClose,
  onSwitchToExport,
  onResetMapping,
  onScrollToLoader,
  onLoadSourceProfile,
  onResolveMappingConflict,
  onSetJoystickMode,
  onSelectJoystickSlot,
  onAssignEntry,
  onToggleModifier,
  onChangeFinalKey,
  onAppSenseChange,
  onRunReview,
  onDownloadReview,
}) {
  return (
    <aside
      ref={refs.dialog}
      className={`mapping-dialog ${panelOpen ? "is-open" : ""}`}
      role="dialog"
      aria-hidden={!panelOpen}
      aria-labelledby="mapping-dialog-title"
      inert={panelOpen ? undefined : true}
    >
      <div className="dialog-header">
        {panelMode === "key" ? (
          <div className="key-header" key={selectedControl.id}>
            <span className="key-header-badge" aria-hidden="true">
              {selectedControl.shortLabel}
            </span>
            <div>
              <h2 id="mapping-dialog-title">
                {editingJoystickSlot
                  ? t("joystick.editingSlot", {
                      control: controlLabel(selectedControl, t),
                      index: joystickSlot + 1,
                    })
                  : controlLabel(selectedControl, t)}
              </h2>
              <p className="key-header-current">
                {entryLabel(activeEntry, t)}
                <kbd>{entryShortcut(activeEntry, t)}</kbd>
              </p>
            </div>
          </div>
        ) : (
          <div className="dialog-title">
            <span className="dialog-kicker">{t("dialog.kicker")}</span>
            <h2 id="mapping-dialog-title">{t("dialog.exportTitle")}</h2>
          </div>
        )}
        <button
          ref={refs.closeButton}
          className="icon-button"
          aria-label={t("dialog.close")}
          onClick={onClose}
        >
          <X size={22} />
        </button>
      </div>

      <div className="dialog-scroll">
        {panelMode === "key" && (
          <KeyAssignmentEditor
            t={t}
            selectedControl={selectedControl}
            selectedEntry={selectedEntry}
            activeEntry={activeEntry}
            editingJoystickSlot={editingJoystickSlot}
            joystickSlot={joystickSlot}
            pickerActions={pickerActions}
            duplicateKeyControls={duplicateKeyControls}
            customNeedsModifier={customNeedsModifier}
            onSetJoystickMode={onSetJoystickMode}
            onSelectJoystickSlot={onSelectJoystickSlot}
            onAssignEntry={onAssignEntry}
            onToggleModifier={onToggleModifier}
            onChangeFinalKey={onChangeFinalKey}
          />
        )}

        {panelMode === "export" && (
          <Suspense fallback={<p className="panel-note">{t("loader.hint")}</p>}>
            <ProfileExportPanel
              t={t}
              refs={refs}
              profile={profile}
              onLoadSourceProfile={onLoadSourceProfile}
              onResolveMappingConflict={onResolveMappingConflict}
              onAppSenseChange={onAppSenseChange}
              onRunReview={onRunReview}
              onDownloadReview={onDownloadReview}
            />
          </Suspense>
        )}
      </div>

      <div className="dialog-footer">
        {panelMode === "key" ? (
          <button className="export-button export-button--full" onClick={onSwitchToExport}>
            {t("buttons.goExport")}
            <ChevronRight size={18} />
          </button>
        ) : (
          <>
            <button className="reset-button" onClick={onResetMapping}>
              <RotateCcw size={17} />
              {t("buttons.reset")}
            </button>
            <button
              className="export-button"
              onClick={profile.source ? onRunReview : onScrollToLoader}
            >
              <ArrowDownToLine size={18} />
              {profile.source ? t("buttons.review") : t("buttons.loadExport")}
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
