import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { Check } from "lucide-react";
import {
  DEFAULT_MAPPING,
  PRINTABLE_KEYS,
} from "../../shared/input-profile.mjs";
import {
  ACTIONS_BY_CONTROL_TYPE,
  CONTROL_BY_ID,
  CONTROLS,
} from "./configurator-catalog.jsx";
import { entryFor } from "./configurator-presenter.js";
import {
  assignMappingEntry,
  indexDuplicateKeyControls,
  isCustom,
  isCustomJoystick,
  loadStoredState,
  mappingsEqual,
  replaceShortcutFinalKey,
  saveStoredState,
  setJoystickMappingMode,
  toggleShortcutModifier,
} from "./configurator-state.js";
import { ConfiguratorWorkspace } from "./components/ConfiguratorWorkspace.jsx";
import { MappingDialog } from "./components/MappingDialog.jsx";
import {
  createTranslator,
  detectLocale,
  saveLocale,
} from "./i18n/index.js";
import {
  createProfileSession,
  profileSessionReducer,
} from "./profile-session.js";
import { loadProfileExportPanel } from "./profile-panel-loader.js";
import { createRetryableLoader } from "./retryable-loader.js";
import { useTheme } from "./hooks/use-theme.js";

const DEFAULT_CONTROL_ID = "key-1";
const TOAST_DURATION_MS = 6000;
const loadProfileWorkflow = createRetryableLoader(
  () => import("./profile-workflow.js"),
);

function prefetchProfileModules() {
  loadProfileWorkflow().catch(() => {});
  loadProfileExportPanel().catch(() => {});
}

export function App() {
  const [locale, setLocale] = useState(detectLocale);
  const { theme, cycleTheme } = useTheme();
  const [mapping, setMapping] = useState(() => loadStoredState().mapping);
  const [selectedControlId, setSelectedControlId] = useState(DEFAULT_CONTROL_ID);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState("key");
  const [toast, setToast] = useState("");
  const [joystickSlot, setJoystickSlot] = useState(null);
  const [profile, dispatchProfile] = useReducer(
    profileSessionReducer,
    undefined,
    createProfileSession,
  );

  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const returnFocusRef = useRef(null);
  const profileInputRef = useRef(null);
  const loaderRef = useRef(null);
  const reviewRef = useRef(null);
  const reviewRequestRef = useRef(0);
  const dialogRefs = useMemo(
    () => ({
      dialog: dialogRef,
      closeButton: closeButtonRef,
      profileInput: profileInputRef,
      loader: loaderRef,
      review: reviewRef,
    }),
    [],
  );

  const t = useMemo(() => createTranslator(locale), [locale]);
  const selectedControl = CONTROL_BY_ID.get(selectedControlId) ?? CONTROLS[0];
  const selectedEntry = entryFor(mapping, selectedControl.id);

  // A joystick direction is edited with the key catalogue while the joystick
  // itself remains one mapping entry.
  const editingJoystickSlot =
    selectedControl.type === "joystick" &&
    joystickSlot !== null &&
    isCustomJoystick(selectedEntry);
  const activeEntry = editingJoystickSlot
    ? selectedEntry.sectors[joystickSlot]
    : selectedEntry;
  const pickerActions = editingJoystickSlot
    ? ACTIONS_BY_CONTROL_TYPE.key
    : selectedControl.type === "joystick"
      ? []
      : ACTIONS_BY_CONTROL_TYPE[selectedControl.type];

  const duplicateKeyControls = useMemo(
    () => indexDuplicateKeyControls(CONTROLS, mapping, selectedControl.id),
    [mapping, selectedControl.id],
  );

  const customNeedsModifier =
    isCustom(activeEntry) &&
    activeEntry.keys.length === 1 &&
    PRINTABLE_KEYS.has(activeEntry.keys.at(-1));

  const openConfigurator = useCallback((controlId) => {
    returnFocusRef.current = document.activeElement;
    setSelectedControlId(controlId);
    setPanelMode("key");
    setPanelOpen(true);
  }, []);

  const closeConfigurator = useCallback(() => setPanelOpen(false), []);

  const changeLocale = useCallback((nextLocale) => {
    setLocale(nextLocale);
    saveLocale(nextLocale);
  }, []);

  const scrollToLoader = useCallback(() => {
    window.requestAnimationFrame(() => {
      loaderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const scrollToReview = useCallback(() => {
    window.requestAnimationFrame(() => {
      reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const assignEntry = useCallback(
    (entry) => {
      setMapping((current) =>
        assignMappingEntry(current, selectedControl.id, joystickSlot, entry),
      );
    },
    [joystickSlot, selectedControl.id],
  );

  const setJoystickMode = useCallback((mode) => {
    setJoystickSlot(null);
    setMapping((current) => setJoystickMappingMode(current, mode));
  }, []);

  const selectJoystickSlot = useCallback((index) => {
    setJoystickSlot((current) => (current === index ? null : index));
  }, []);

  const updateCustomKeys = useCallback(
    (keys) => assignEntry({ type: "custom", keys }),
    [assignEntry],
  );

  const toggleModifier = useCallback(
    (modifier) => {
      if (!isCustom(activeEntry)) return;
      updateCustomKeys(toggleShortcutModifier(activeEntry.keys, modifier));
    },
    [activeEntry, updateCustomKeys],
  );

  const changeFinalKey = useCallback(
    (finalKey) => {
      if (!isCustom(activeEntry)) return;
      updateCustomKeys(replaceShortcutFinalKey(activeEntry.keys, finalKey));
    },
    [activeEntry, updateCustomKeys],
  );

  const resetMapping = useCallback(() => {
    setMapping(DEFAULT_MAPPING);
    dispatchProfile({ type: "conflict-resolved" });
    setToast(t("toasts.reset"));
  }, [t]);

  const loadSourceProfile = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      let workflow;
      try {
        const [text, loadedWorkflow] = await Promise.all([
          file.text(),
          loadProfileWorkflow(),
        ]);
        workflow = loadedWorkflow;
        const imported = workflow.prepareImportedProfile(JSON.parse(text));
        const derivedMapping = { ...DEFAULT_MAPPING, ...imported.derived.mapping };
        let mappingConflict = null;

        if (imported.derived.assigned === 0 || mappingsEqual(mapping, derivedMapping)) {
          setToast(t("toasts.loaded"));
        } else if (mappingsEqual(mapping, DEFAULT_MAPPING)) {
          setMapping(derivedMapping);
          setToast(t("toasts.loadedMapping"));
        } else {
          mappingConflict = { mapping: derivedMapping };
        }

        dispatchProfile({
          type: "profile-loaded",
          payload: {
            source: imported.source,
            fileName: file.name,
            info: imported.info,
            layerCreated: imported.layerCreated,
            mappingConflict,
          },
        });
      } catch (error) {
        dispatchProfile({
          type: "profile-failed",
          error: workflow?.describeProfileError(error, t) ?? {
            message: error instanceof Error ? error.message : t("errors.invalidFile"),
            code: null,
          },
        });
      }
    },
    [mapping, t],
  );

  const resolveMappingConflict = useCallback(
    (adoptDerived) => {
      if (!profile.mappingConflict) return;
      if (adoptDerived) {
        setMapping(profile.mappingConflict.mapping);
        setToast(t("toasts.loadedMapping"));
      } else {
        setToast(t("toasts.keptMapping"));
      }
      dispatchProfile({ type: "conflict-resolved" });
    },
    [profile.mappingConflict, t],
  );

  const runReview = useCallback(async () => {
    if (!profile.source) {
      scrollToLoader();
      setToast(t("toasts.needProfile"));
      return;
    }

    const requestId = reviewRequestRef.current + 1;
    reviewRequestRef.current = requestId;
    let workflow;
    try {
      workflow = await loadProfileWorkflow();
      const review = await workflow.createProfileReview(
        profile.source,
        mapping,
        profile.appSenseIds,
      );
      if (reviewRequestRef.current !== requestId) return;
      dispatchProfile({ type: "review-ready", review });
      scrollToReview();
    } catch (error) {
      if (reviewRequestRef.current !== requestId) return;
      dispatchProfile({
        type: "review-failed",
        error: workflow?.describeProfileError(error, t) ?? {
          message: error instanceof Error ? error.message : t("errors.invalidFile"),
          code: null,
        },
      });
    }
  }, [mapping, profile.appSenseIds, profile.source, scrollToLoader, scrollToReview, t]);

  const switchToExport = useCallback(() => {
    prefetchProfileModules();
    setPanelMode("export");
    if (profile.source) void runReview();
  }, [profile.source, runReview]);

  const openReviewFromHero = useCallback(() => {
    prefetchProfileModules();
    returnFocusRef.current = document.activeElement;
    setPanelOpen(true);
    setPanelMode("export");
    if (profile.source) void runReview();
    else scrollToLoader();
  }, [profile.source, runReview, scrollToLoader]);

  const changeAppSense = useCallback((field, value) => {
    reviewRequestRef.current += 1;
    dispatchProfile({ type: "appsense-changed", field, value });
  }, []);

  const downloadReview = useCallback(() => {
    if (!profile.review) return;
    const blob = new Blob([profile.review.json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "Claude-macOS-profile.json";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast(t("toasts.generated"));
  }, [profile.review, t]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t("meta.title");
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t("meta.description"));
  }, [locale, t]);

  useEffect(() => {
    saveStoredState(mapping);
  }, [mapping]);

  // A review belongs to one exact source and mapping. Cancel slow hashes when
  // either changes so stale JSON can never reappear after an edit.
  useEffect(() => {
    reviewRequestRef.current += 1;
    dispatchProfile({ type: "review-invalidated" });
  }, [mapping, profile.source]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), TOAST_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    dialogRef.current?.querySelector(".dialog-scroll")?.scrollTo({ top: 0 });
    setJoystickSlot(null);
  }, [panelMode, panelOpen, selectedControlId]);

  useEffect(() => {
    if (!panelOpen) {
      if (returnFocusRef.current) {
        window.requestAnimationFrame(() => returnFocusRef.current?.focus());
      }
      return undefined;
    }

    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeConfigurator();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeConfigurator, panelOpen]);

  return (
    <main className={`app-shell${panelOpen ? " is-panel-open" : ""}`}>
      <ConfiguratorWorkspace
        t={t}
        locale={locale}
        theme={theme}
        mapping={mapping}
        selectedControlId={selectedControl.id}
        panelOpen={panelOpen}
        sourceProfileLoaded={Boolean(profile.source)}
        onCycleTheme={cycleTheme}
        onLocaleChange={changeLocale}
        onOpenConfigurator={openConfigurator}
        onOpenExport={openReviewFromHero}
      />

      <MappingDialog
        t={t}
        refs={dialogRefs}
        panelOpen={panelOpen}
        panelMode={panelMode}
        selectedControl={selectedControl}
        selectedEntry={selectedEntry}
        activeEntry={activeEntry}
        editingJoystickSlot={editingJoystickSlot}
        joystickSlot={joystickSlot}
        pickerActions={pickerActions}
        duplicateKeyControls={duplicateKeyControls}
        customNeedsModifier={customNeedsModifier}
        profile={profile}
        onClose={closeConfigurator}
        onSwitchToExport={switchToExport}
        onResetMapping={resetMapping}
        onScrollToLoader={scrollToLoader}
        onLoadSourceProfile={loadSourceProfile}
        onResolveMappingConflict={resolveMappingConflict}
        onSetJoystickMode={setJoystickMode}
        onSelectJoystickSlot={selectJoystickSlot}
        onAssignEntry={assignEntry}
        onToggleModifier={toggleModifier}
        onChangeFinalKey={changeFinalKey}
        onAppSenseChange={changeAppSense}
        onRunReview={runReview}
        onDownloadReview={downloadReview}
      />

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <Check size={18} />
          {toast}
        </div>
      )}
    </main>
  );
}
