import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowDownUp,
  Check,
  ChevronRight,
  Command,
  Diff,
  FileJson,
  Keyboard,
  Mic,
  MousePointer2,
  Move,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  Volume2,
  X,
} from "lucide-react";
import {
  buildInputProfile,
  deriveMappingFromProfile,
  DEFAULT_MAPPING,
  FINAL_KEYCODES,
  inspectInputProfile,
  PRINTABLE_KEYS,
  WHEEL_MODES,
} from "../../shared/input-profile.mjs";
import {
  LOCALES,
  LOCALE_LABELS,
  createTranslator,
  detectLocale,
  saveLocale,
} from "./i18n/index.js";

const GUIDE_URL =
  "https://github.com/thannous/claude-codex-micro/blob/main/docs/installation.md";
const INPUT_RELEASES_URL = "https://github.com/worklouder/input-releases/releases";

const BASE_CONTROLS = [
  {
    id: "joystick",
    shortLabel: "NAV",
    type: "joystick",
    x: 22.3,
    y: 19.7,
    w: 13.3,
    h: 13.6,
  },
  {
    id: "wheel",
    shortLabel: "SCROLL",
    type: "dial",
    x: 65.7,
    y: 20.1,
    w: 12.2,
    h: 13.2,
  },
  { id: "key-1", shortLabel: "K1", type: "key", x: 21.9, y: 49.4, w: 13.7, h: 12.7 },
  { id: "key-2", shortLabel: "K2", type: "key", x: 35.5, y: 49.4, w: 13.7, h: 12.7 },
  { id: "key-3", shortLabel: "K3", type: "key", x: 50.6, y: 49.4, w: 13.7, h: 12.7 },
  { id: "key-4", shortLabel: "K4", type: "key", x: 64.9, y: 49.4, w: 13.7, h: 12.7 },
];

const ADVANCED_CONTROLS = [
  { id: "key-5", shortLabel: "A1", type: "key", x: 21.9, y: 34.5, w: 13.7, h: 12.7 },
  { id: "key-6", shortLabel: "A2", type: "key", x: 35.5, y: 34.5, w: 13.7, h: 12.7 },
  { id: "key-7", shortLabel: "A3", type: "key", x: 50.6, y: 34.5, w: 13.7, h: 12.7 },
  { id: "key-8", shortLabel: "A4", type: "key", x: 64.9, y: 34.5, w: 13.7, h: 12.7 },
];

const RESERVED_ZONES = [
  { id: "led-1", x: 36.2, y: 20.0, w: 13.7, h: 12.7 },
  { id: "led-2", x: 50.4, y: 20.0, w: 13.7, h: 12.7 },
  { id: "sensor", x: 21.9, y: 63.9, w: 13.7, h: 12.7, round: true },
  { id: "mic", x: 35.5, y: 63.9, w: 28.8, h: 12.7 },
  { id: "sparkle", x: 64.9, y: 63.9, w: 13.7, h: 12.7 },
];

const ACTIONS = {
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
  stop: {
    id: "stop",
    shortcut: "Esc",
    icon: Square,
    controlTypes: ["key"],
    exportLabel: "ESC",
  },
  none: {
    id: "none",
    shortcut: null,
    icon: X,
    controlTypes: ["key", "dial", "joystick"],
    exportLabel: "NONE",
  },
};

const KEY_ACTION_IDS = new Set(["newSession", "voice", "diff", "stop", "none"]);
const JOYSTICK_ACTION_IDS = new Set(["navigation", "none"]);

const MODIFIERS = ["Command", "Shift", "Option", "Control"];
const MODIFIER_SYMBOLS = { Command: "⌘", Shift: "⇧", Option: "⌥", Control: "⌃" };
const KEY_SYMBOLS = {
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  PageUp: "Pg↑",
  PageDown: "Pg↓",
  Escape: "Esc",
  Space: "␣",
};
const FINAL_KEY_OPTIONS = Object.keys(FINAL_KEYCODES);
const DEFAULT_CUSTOM = { type: "custom", keys: ["Command", "K"] };

const MAPPING_STORAGE_KEY = "codex-micro-mapping";
const TOAST_DURATION_MS = 6000;

const isCustom = (entry) => typeof entry === "object" && entry !== null && entry.type === "custom";

function formatCustomKeys(keys) {
  const modifiers = keys.slice(0, -1);
  const finalKey = keys.at(-1);
  const modifierText = modifiers.map((key) => MODIFIER_SYMBOLS[key] ?? key).join("");
  return `${modifierText}${KEY_SYMBOLS[finalKey] ?? finalKey}`;
}

function isValidEntry(controlId, entry) {
  if (controlId === "joystick") return JOYSTICK_ACTION_IDS.has(entry);
  if (controlId === "wheel") return typeof entry === "string" && entry in WHEEL_MODES;
  if (isCustom(entry)) {
    return Array.isArray(entry.keys) && entry.keys.every((key) => typeof key === "string");
  }
  return KEY_ACTION_IDS.has(entry);
}

function loadStoredState() {
  const fallback = { mapping: DEFAULT_MAPPING, advancedEnabled: false };
  try {
    const raw = window.localStorage.getItem(MAPPING_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.mapping !== "object") return fallback;
    const mapping = {};
    for (const [controlId, entry] of Object.entries(parsed.mapping)) {
      if (isValidEntry(controlId, entry)) mapping[controlId] = entry;
    }
    for (const controlId of Object.keys(DEFAULT_MAPPING)) {
      if (!(controlId in mapping)) mapping[controlId] = DEFAULT_MAPPING[controlId];
    }
    return { mapping, advancedEnabled: parsed.advancedEnabled === true };
  } catch {
    return fallback;
  }
}

async function sha256Hex(text) {
  try {
    const digest = await window.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(text),
    );
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "";
  }
}

export function App() {
  const initialState = useMemo(loadStoredState, []);
  const [locale, setLocale] = useState(detectLocale);
  const [mapping, setMapping] = useState(initialState.mapping);
  const [advancedEnabled, setAdvancedEnabled] = useState(initialState.advancedEnabled);
  const [selectedControlId, setSelectedControlId] = useState("key-1");
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [sourceProfile, setSourceProfile] = useState(null);
  const [sourceFileName, setSourceFileName] = useState("");
  const [profileInfo, setProfileInfo] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [review, setReview] = useState(null);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const returnFocusRef = useRef(null);
  const profileInputRef = useRef(null);
  const loaderRef = useRef(null);
  const reviewRef = useRef(null);

  const t = useMemo(() => createTranslator(locale), [locale]);

  const controls = advancedEnabled ? [...BASE_CONTROLS, ...ADVANCED_CONTROLS] : BASE_CONTROLS;
  const controlLabel = (control) => t(`controls.${control.id}`);
  const entryFor = (controlId) => mapping[controlId] ?? "none";
  const entryExportLabel = (entry) =>
    isCustom(entry) ? formatCustomKeys(entry.keys) : ACTIONS[entry].exportLabel;
  const entryLabel = (entry) =>
    isCustom(entry) ? t("actions.custom.label") : t(`actions.${entry}.label`);
  const entryShortcut = (entry) => {
    if (isCustom(entry)) return formatCustomKeys(entry.keys);
    return ACTIONS[entry].shortcut ?? t(`actions.${entry}.shortcut`);
  };

  const describeError = (error) => {
    if (error instanceof SyntaxError) return { message: t("errors.invalidJson"), code: null };
    if (error?.code && LOCALES.fr.errors[error.code]) {
      return { message: t(`errors.${error.code}`), code: error.code };
    }
    return {
      message: error instanceof Error ? error.message : t("errors.invalidFile"),
      code: null,
    };
  };

  const selectedControl = useMemo(
    () => controls.find((control) => control.id === selectedControlId) ?? controls[0],
    [controls, selectedControlId],
  );
  const selectedEntry = entryFor(selectedControl.id);
  const availableActions = Object.values(ACTIONS).filter((action) =>
    action.controlTypes.includes(selectedControl.type),
  );

  const duplicateControlFor = (entry) => {
    if (entry === "none" || selectedControl.type !== "key") return null;
    const serialized = JSON.stringify(entry);
    return (
      controls.find(
        (control) =>
          control.id !== selectedControl.id &&
          control.type === "key" &&
          JSON.stringify(entryFor(control.id)) === serialized,
      ) ?? null
    );
  };

  const openConfigurator = (controlId = selectedControlId) => {
    returnFocusRef.current = document.activeElement;
    setSelectedControlId(controlId);
    setPanelOpen(true);
  };

  const closeConfigurator = () => setPanelOpen(false);

  const assignEntry = (entry) => {
    setMapping((current) => ({ ...current, [selectedControl.id]: entry }));
  };

  const resetMapping = () => {
    setMapping(DEFAULT_MAPPING);
    setAdvancedEnabled(false);
    if (!BASE_CONTROLS.some((control) => control.id === selectedControlId)) {
      setSelectedControlId("key-1");
    }
    setToast(t("toasts.reset"));
  };

  const toggleAdvanced = (enabled) => {
    setAdvancedEnabled(enabled);
    if (!enabled) {
      setMapping((current) => {
        const next = { ...current };
        for (const control of ADVANCED_CONTROLS) delete next[control.id];
        return next;
      });
      if (ADVANCED_CONTROLS.some((control) => control.id === selectedControlId)) {
        setSelectedControlId("key-1");
      }
    }
  };

  const changeLocale = (nextLocale) => {
    setLocale(nextLocale);
    saveLocale(nextLocale);
  };

  const updateCustomKeys = (keys) => {
    assignEntry({ type: "custom", keys });
  };

  const toggleModifier = (modifier) => {
    if (!isCustom(selectedEntry)) return;
    const keys = selectedEntry.keys;
    const finalKey = keys.at(-1);
    const active = new Set(keys.slice(0, -1));
    if (active.has(modifier)) active.delete(modifier);
    else active.add(modifier);
    const modifiers = MODIFIERS.filter((candidate) => active.has(candidate));
    updateCustomKeys([...modifiers, finalKey]);
  };

  const changeFinalKey = (finalKey) => {
    if (!isCustom(selectedEntry)) return;
    updateCustomKeys([...selectedEntry.keys.slice(0, -1), finalKey]);
  };

  const customNeedsModifier =
    isCustom(selectedEntry) &&
    selectedEntry.keys.length === 1 &&
    PRINTABLE_KEYS.has(selectedEntry.keys.at(-1));

  const scrollToLoader = () => {
    window.requestAnimationFrame(() => {
      loaderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const scrollToReview = () => {
    window.requestAnimationFrame(() => {
      reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const loadSourceProfile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const inspection = inspectInputProfile(parsed);
      const derived = deriveMappingFromProfile(parsed);
      setSourceProfile(parsed);
      setSourceFileName(file.name);
      setProfileInfo(inspection);
      setProfileError(null);
      if (derived.assigned > 0) {
        setMapping({ ...DEFAULT_MAPPING, ...derived.mapping });
        if (derived.advancedInUse) setAdvancedEnabled(true);
        setToast(t("toasts.loadedMapping"));
      } else {
        setToast(t("toasts.loaded"));
      }
    } catch (error) {
      setProfileError(describeError(error));
    }
  };

  const runReview = async () => {
    if (!sourceProfile) {
      scrollToLoader();
      setToast(t("toasts.needProfile"));
      return;
    }

    try {
      const { profile, report } = buildInputProfile(sourceProfile, mapping);
      const json = `${JSON.stringify(profile, null, 2)}\n`;
      const sha = await sha256Hex(json);
      setReview({ json, sha, report });
      setProfileError(null);
      scrollToReview();
    } catch (error) {
      setProfileError(describeError(error));
      setReview(null);
    }
  };

  const openReviewFromHero = () => {
    openConfigurator();
    if (sourceProfile) runReview();
    else scrollToLoader();
  };

  const downloadReview = () => {
    if (!review) return;
    const blob = new Blob([review.json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "Claude-macOS-profile.json";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast(t("toasts.generated"));
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t("meta.title");
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", t("meta.description"));
  }, [locale, t]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        MAPPING_STORAGE_KEY,
        JSON.stringify({ mapping, advancedEnabled }),
      );
    } catch {
      // Stockage indisponible : la configuration ne sera pas mémorisée.
    }
  }, [mapping, advancedEnabled]);

  // Le rapport décrit un mapping précis : toute modification l'invalide.
  useEffect(() => {
    setReview(null);
  }, [mapping, sourceProfile]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), TOAST_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!panelOpen) {
      if (returnFocusRef.current) {
        window.requestAnimationFrame(() => returnFocusRef.current?.focus());
      }
      return undefined;
    }

    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeConfigurator();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll(
          'button:not([disabled]), [href], select, input:not([hidden]), summary, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("hidden"));
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [panelOpen]);

  const reservedZones = advancedEnabled
    ? RESERVED_ZONES
    : [
        ...RESERVED_ZONES,
        ...ADVANCED_CONTROLS.map((control) => ({
          id: `locked-${control.id}`,
          x: control.x,
          y: control.y,
          w: control.w,
          h: control.h,
          locked: true,
        })),
      ];

  return (
    <main className="app-shell">
      <div
        className="page-content"
        inert={panelOpen ? true : undefined}
        aria-hidden={panelOpen ? "true" : undefined}
      >
        <header className="topbar">
          <a className="brand" href="#configurateur" aria-label={t("topbar.brandHome")}>
            <span className="brand-mark">C</span>
            <span>Codex Micro</span>
          </a>
          <div className="topbar-tools">
            <select
              className="language-select"
              aria-label={t("topbar.languageLabel")}
              value={locale}
              onChange={(event) => changeLocale(event.target.value)}
            >
              {Object.entries(LOCALE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <span className="local-status">
              <span aria-hidden="true" />
              {sourceProfile
                ? t("topbar.backupVerified")
                : t("topbar.localProcessing")}
            </span>
          </div>
        </header>

        <section className="hero" id="configurateur">
          <div className="hero-copy">
            <span className="eyebrow">{t("hero.eyebrow")}</span>
            <h1>{t("hero.title")}</h1>
            <p>{t("hero.subtitle")}</p>
          </div>

          <div className="device-stage">
            <div className="device-wrap">
              <img
                className="device-image"
                src="/assets/ai-controller-claude-v1.png"
                alt={t("device.alt")}
              />
              {controls.map((control) => {
                const entry = entryFor(control.id);
                return (
                  <button
                    key={control.id}
                    className={`key-hotspot key-hotspot--${control.type}`}
                    style={{
                      left: `${control.x}%`,
                      top: `${control.y}%`,
                      width: `${control.w}%`,
                      height: `${control.h}%`,
                    }}
                    aria-label={t("hotspot.configure", {
                      control: controlLabel(control),
                      action: entryLabel(entry),
                    })}
                    onClick={() => openConfigurator(control.id)}
                  >
                    <span>{entryExportLabel(entry)}</span>
                  </button>
                );
              })}
              {reservedZones.map((zone) => (
                <span
                  key={zone.id}
                  className={`reserved-hotspot${zone.round ? " reserved-hotspot--round" : ""}`}
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.w}%`,
                    height: `${zone.h}%`,
                  }}
                  aria-hidden="true"
                >
                  <span>
                    {zone.locked ? t("device.advancedTip") : t("device.reservedTip")}
                  </span>
                </span>
              ))}
            </div>

            <button className="configure-button" onClick={() => openConfigurator("key-1")}>
              <SlidersHorizontal size={18} />
              {t("buttons.configureKeys")}
              <ChevronRight size={18} />
            </button>
          </div>

          <button className="generate-button" onClick={openReviewFromHero}>
            <ArrowDownToLine size={18} />
            {t("buttons.generateJson")}
          </button>

          <div className="mapping-preview" aria-label={t("dialog.mappingLabel")}>
            {controls.map((control) => {
              const entry = entryFor(control.id);
              const exportLabel = entryExportLabel(entry);
              return (
                <button
                  key={control.id}
                  aria-label={t("hotspot.configure", {
                    control: controlLabel(control),
                    action: entryLabel(entry),
                  })}
                  onClick={() => openConfigurator(control.id)}
                >
                  {control.shortLabel !== exportLabel && <span>{control.shortLabel}</span>}
                  <strong>{exportLabel}</strong>
                </button>
              );
            })}
          </div>

          <p className="device-note">{t("device.reservedNote")}</p>
          <p className="quiet-note">{t("quietNote")}</p>
        </section>
      </div>

      <aside
        ref={dialogRef}
        className={`mapping-dialog ${panelOpen ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!panelOpen}
        aria-labelledby="mapping-dialog-title"
        inert={panelOpen ? undefined : true}
      >
        <div className="dialog-header">
          <div>
            <span>{t("dialog.kicker")}</span>
            <h2 id="mapping-dialog-title">{t("wizard.title")}</h2>
          </div>
          <button
            ref={closeButtonRef}
            className="icon-button"
            aria-label={t("dialog.close")}
            onClick={closeConfigurator}
          >
            <X size={22} />
          </button>
        </div>

        <div className="dialog-scroll">
          <section
            ref={loaderRef}
            className="wizard-step"
            aria-labelledby="wizard-step-1-title"
          >
            <div className="wizard-step-header">
              <span className="wizard-step-number" aria-hidden="true">
                1
              </span>
              <h3 id="wizard-step-1-title">{t("wizard.step1Title")}</h3>
            </div>

            <div className="profile-loader">
              <div className="profile-loader-copy">
                <span className="profile-loader-icon" aria-hidden="true">
                  {profileInfo ? <ShieldCheck size={20} /> : <FileJson size={20} />}
                </span>
                <span>
                  <strong id="profile-loader-title">
                    {profileInfo ? t("loader.titleVerified") : t("loader.titleLoad")}
                  </strong>
                  <small>
                    {profileInfo
                      ? t("loader.meta", {
                          file: sourceFileName,
                          layer: profileInfo.layerName,
                          appSense: profileInfo.appSenseLinked
                            ? t("loader.appSenseKept")
                            : t("loader.appSenseNotLinked"),
                        })
                      : t("loader.hint")}
                  </small>
                </span>
              </div>
              <input
                ref={profileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={loadSourceProfile}
                hidden
              />
              <button
                type="button"
                className="profile-load-button"
                onClick={() => profileInputRef.current?.click()}
              >
                {profileInfo ? t("buttons.replace") : t("buttons.chooseJson")}
              </button>
              {profileError && (
                <div className="profile-error" role="alert">
                  <p>{profileError.message}</p>
                  {profileError.code && LOCALES.fr.hints?.[profileError.code] && (
                    <p className="profile-hint">{t(`hints.${profileError.code}`)}</p>
                  )}
                  {sourceProfile && (
                    <p className="profile-error-note">{t("errors.previousKept")}</p>
                  )}
                </div>
              )}
            </div>

            <details className="help-details">
              <summary>{t("help.summary")}</summary>
              <ol>
                <li>{t("help.step1")}</li>
                <li>{t("help.step2")}</li>
                <li>{t("help.step3")}</li>
              </ol>
              <p className="help-links">
                <a href={GUIDE_URL} target="_blank" rel="noreferrer">
                  {t("help.guideLink")}
                </a>
                <a href={INPUT_RELEASES_URL} target="_blank" rel="noreferrer">
                  {t("help.releasesLink")}
                </a>
              </p>
            </details>
          </section>

          <section className="wizard-step" aria-labelledby="wizard-step-2-title">
            <div className="wizard-step-header">
              <span className="wizard-step-number" aria-hidden="true">
                2
              </span>
              <h3 id="wizard-step-2-title">{t("wizard.step2Title")}</h3>
            </div>

            <div className="control-tabs" aria-label={t("dialog.chooseControl")}>
              {controls.map((control) => {
                const entry = entryFor(control.id);
                const exportLabel = entryExportLabel(entry);
                return (
                  <button
                    key={control.id}
                    className={control.id === selectedControl.id ? "is-active" : ""}
                    aria-pressed={control.id === selectedControl.id}
                    aria-label={`${controlLabel(control)} : ${entryLabel(entry)}`}
                    onClick={() => setSelectedControlId(control.id)}
                  >
                    {control.shortLabel !== exportLabel && <span>{control.shortLabel}</span>}
                    <strong>{exportLabel}</strong>
                  </button>
                );
              })}
            </div>

            <section className="action-picker" aria-labelledby="action-picker-title">
              <div className="section-label">
                <h3 id="action-picker-title">{controlLabel(selectedControl)}</h3>
                <kbd>{entryShortcut(selectedEntry)}</kbd>
              </div>

              <div className="action-list">
                {availableActions.map((action) => {
                  const Icon = action.icon;
                  const active = !isCustom(selectedEntry) && selectedEntry === action.id;
                  const duplicateControl = duplicateControlFor(action.id);
                  return (
                    <button
                      key={action.id}
                      className={active ? "is-active" : ""}
                      aria-pressed={active}
                      onClick={() => assignEntry(action.id)}
                    >
                      <span className="action-icon">
                        <Icon size={19} />
                      </span>
                      <span className="action-copy">
                        <strong>
                          {t(`actions.${action.id}.label`)}
                          {action.experimental && (
                            <em className="experimental-badge">
                              {t("picker.experimental")}
                            </em>
                          )}
                        </strong>
                        <small>{t(`actions.${action.id}.description`)}</small>
                        {duplicateControl && (
                          <small className="action-duplicate">
                            {t("picker.alreadyOn", {
                              control: controlLabel(duplicateControl),
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

                {selectedControl.type === "key" && (
                  <button
                    className={isCustom(selectedEntry) ? "is-active" : ""}
                    aria-pressed={isCustom(selectedEntry)}
                    onClick={() => {
                      if (!isCustom(selectedEntry)) assignEntry(DEFAULT_CUSTOM);
                    }}
                  >
                    <span className="action-icon">
                      <Keyboard size={19} />
                    </span>
                    <span className="action-copy">
                      <strong>{t("actions.custom.label")}</strong>
                      <small>{t("actions.custom.description")}</small>
                      {isCustom(selectedEntry) && duplicateControlFor(selectedEntry) && (
                        <small className="action-duplicate">
                          {t("picker.alreadyOn", {
                            control: controlLabel(duplicateControlFor(selectedEntry)),
                          })}
                        </small>
                      )}
                    </span>
                    <kbd>
                      {isCustom(selectedEntry)
                        ? formatCustomKeys(selectedEntry.keys)
                        : "⌘ …"}
                    </kbd>
                    <span className="check-slot" aria-hidden="true">
                      {isCustom(selectedEntry) && <Check size={18} />}
                    </span>
                  </button>
                )}
              </div>

              {isCustom(selectedEntry) && (
                <div className="custom-editor">
                  <div className="custom-editor-row">
                    <span className="custom-editor-label">
                      {t("picker.modifiersLabel")}
                    </span>
                    <div className="custom-modifiers">
                      {MODIFIERS.map((modifier) => {
                        const active = selectedEntry.keys.slice(0, -1).includes(modifier);
                        return (
                          <button
                            key={modifier}
                            type="button"
                            className={active ? "is-active" : ""}
                            aria-pressed={active}
                            onClick={() => toggleModifier(modifier)}
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
                      value={selectedEntry.keys.at(-1)}
                      onChange={(event) => changeFinalKey(event.target.value)}
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

            <label className="advanced-toggle">
              <input
                type="checkbox"
                checked={advancedEnabled}
                onChange={(event) => toggleAdvanced(event.target.checked)}
              />
              <span>
                <strong>
                  {t("advanced.title")}
                  <em className="experimental-badge">{t("picker.experimental")}</em>
                </strong>
                <small>{t("advanced.hint")}</small>
              </span>
            </label>
          </section>

          <section
            ref={reviewRef}
            className="wizard-step"
            aria-labelledby="wizard-step-3-title"
          >
            <div className="wizard-step-header">
              <span className="wizard-step-number" aria-hidden="true">
                3
              </span>
              <h3 id="wizard-step-3-title">{t("wizard.step3Title")}</h3>
            </div>

            {review ? (
              <div className="review-report" role="status">
                <ul className="review-checklist">
                  <li>
                    <Check size={15} aria-hidden="true" />
                    {t("review.nativePreserved")}
                  </li>
                  <li>
                    <Check size={15} aria-hidden="true" />
                    {t("review.appSensePreserved")}
                  </li>
                  <li>
                    <Check size={15} aria-hidden="true" />
                    {t("review.layersPreserved", { count: review.report.preservedLayers })}
                  </li>
                  <li>
                    <Check size={15} aria-hidden="true" />
                    {t("review.createdActions", { count: review.report.createdActions })}
                  </li>
                  {review.report.advancedAssignments > 0 && (
                    <li>
                      <Check size={15} aria-hidden="true" />
                      {t("review.advancedAssigned", {
                        count: review.report.advancedAssignments,
                      })}
                    </li>
                  )}
                </ul>
                {review.sha && (
                  <p className="review-sha">
                    <span>{t("review.shaLabel")}</span>
                    <code>{review.sha}</code>
                  </p>
                )}
                <button className="review-download" onClick={downloadReview}>
                  <ArrowDownToLine size={18} />
                  {t("buttons.download")}
                </button>
              </div>
            ) : (
              <div className="review-empty">
                <p>{sourceProfile ? t("review.ready") : t("review.needProfile")}</p>
                <button
                  className="review-run"
                  disabled={!sourceProfile}
                  onClick={runReview}
                >
                  {t("buttons.review")}
                </button>
              </div>
            )}
          </section>

          <p className="panel-note">{t("panelNote")}</p>
        </div>

        <div className="dialog-footer">
          <button className="reset-button" onClick={resetMapping}>
            <RotateCcw size={17} />
            {t("buttons.reset")}
          </button>
          <button
            className="export-button"
            onClick={() => (sourceProfile ? runReview() : scrollToLoader())}
          >
            <ArrowDownToLine size={18} />
            {sourceProfile ? t("buttons.review") : t("buttons.loadExport")}
          </button>
        </div>
      </aside>

      {panelOpen && (
        <button
          className="dialog-scrim"
          aria-label={t("dialog.scrimClose")}
          onClick={closeConfigurator}
        />
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <Check size={18} />
          {toast}
        </div>
      )}
    </main>
  );
}
