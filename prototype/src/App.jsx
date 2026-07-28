import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  Check,
  ChevronRight,
  Command,
  Diff,
  FileJson,
  Mic,
  MousePointer2,
  Move,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  X,
} from "lucide-react";
import {
  buildInputProfile,
  inspectInputProfile,
} from "../../shared/input-profile.mjs";

const CONTROLS = [
  {
    id: "joystick",
    label: "Joystick",
    shortLabel: "NAV",
    type: "joystick",
    x: 22.3,
    y: 19.7,
    w: 13.3,
    h: 13.6,
  },
  {
    id: "wheel",
    label: "Molette",
    shortLabel: "SCROLL",
    type: "dial",
    x: 65.7,
    y: 20.1,
    w: 12.2,
    h: 13.2,
  },
  {
    id: "key-1",
    label: "Touche 1",
    shortLabel: "K1",
    type: "key",
    x: 21.9,
    y: 49.4,
    w: 13.7,
    h: 12.7,
  },
  {
    id: "key-2",
    label: "Touche 2",
    shortLabel: "K2",
    type: "key",
    x: 35.5,
    y: 49.4,
    w: 13.7,
    h: 12.7,
  },
  {
    id: "key-3",
    label: "Touche 3",
    shortLabel: "K3",
    type: "key",
    x: 50.6,
    y: 49.4,
    w: 13.7,
    h: 12.7,
  },
  {
    id: "key-4",
    label: "Touche 4",
    shortLabel: "K4",
    type: "key",
    x: 64.9,
    y: 49.4,
    w: 13.7,
    h: 12.7,
  },
];

const ACTIONS = {
  navigation: {
    id: "navigation",
    label: "Navigation",
    description: "Se déplacer avec les flèches",
    shortcut: "↑  →  ↓  ←",
    icon: Move,
    controlTypes: ["joystick"],
    exportLabel: "NAV",
    action: {
      type: "directional-keys",
      up: "ArrowUp",
      right: "ArrowRight",
      down: "ArrowDown",
      left: "ArrowLeft",
    },
  },
  scroll: {
    id: "scroll",
    label: "Défilement",
    description: "Faire défiler la conversation page par page",
    shortcut: "Page ↑  Page ↓",
    icon: MousePointer2,
    controlTypes: ["dial"],
    exportLabel: "SCROLL",
    action: { type: "page-keys", counterClockwise: "PageUp", clockwise: "PageDown" },
  },
  newSession: {
    id: "newSession",
    label: "Nouvelle session",
    description: "Ouvrir une nouvelle session Claude",
    shortcut: "⌘ N",
    icon: Command,
    controlTypes: ["key"],
    exportLabel: "NEW",
    action: { type: "shortcut", keys: ["Command", "N"] },
  },
  voice: {
    id: "voice",
    label: "Mode vocal",
    description: "Activer la conversation vocale",
    shortcut: "⌘ D",
    icon: Mic,
    controlTypes: ["key"],
    exportLabel: "VOICE",
    action: { type: "shortcut", keys: ["Command", "D"] },
  },
  diff: {
    id: "diff",
    label: "Afficher le diff",
    description: "Ouvrir ou masquer le panneau diff",
    shortcut: "⌘ ⇧ D",
    icon: Diff,
    controlTypes: ["key"],
    exportLabel: "DIFF",
    action: { type: "shortcut", keys: ["Command", "Shift", "D"] },
  },
  stop: {
    id: "stop",
    label: "Arrêter la réponse",
    description: "Interrompre la réponse en cours",
    shortcut: "Esc",
    icon: Square,
    controlTypes: ["key"],
    exportLabel: "ESC",
    action: { type: "shortcut", keys: ["Escape"] },
  },
  none: {
    id: "none",
    label: "Aucune action",
    description: "Laisser ce contrôle libre",
    shortcut: "Non assigné",
    icon: X,
    controlTypes: ["key", "dial", "joystick"],
    exportLabel: "NONE",
    action: { type: "none" },
  },
};

const DEFAULT_MAPPING = {
  joystick: "navigation",
  wheel: "scroll",
  "key-1": "newSession",
  "key-2": "voice",
  "key-3": "diff",
  "key-4": "stop",
};

export function App() {
  const [mapping, setMapping] = useState(DEFAULT_MAPPING);
  const [selectedControlId, setSelectedControlId] = useState("key-1");
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [sourceProfile, setSourceProfile] = useState(null);
  const [sourceFileName, setSourceFileName] = useState("");
  const [profileInfo, setProfileInfo] = useState(null);
  const [profileError, setProfileError] = useState("");
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const returnFocusRef = useRef(null);
  const profileInputRef = useRef(null);

  const selectedControl = useMemo(
    () => CONTROLS.find((control) => control.id === selectedControlId) ?? CONTROLS[0],
    [selectedControlId],
  );
  const selectedAction = ACTIONS[mapping[selectedControl.id]];
  const availableActions = Object.values(ACTIONS).filter((action) =>
    action.controlTypes.includes(selectedControl.type),
  );

  const openConfigurator = (controlId = selectedControlId) => {
    returnFocusRef.current = document.activeElement;
    setSelectedControlId(controlId);
    setPanelOpen(true);
  };

  const closeConfigurator = () => setPanelOpen(false);

  const assignAction = (actionId) => {
    setMapping((current) => ({ ...current, [selectedControl.id]: actionId }));
  };

  const resetMapping = () => {
    setMapping(DEFAULT_MAPPING);
    setToast("Mapping Claude restauré.");
  };

  const loadSourceProfile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const inspection = inspectInputProfile(parsed);
      setSourceProfile(parsed);
      setSourceFileName(file.name);
      setProfileInfo(inspection);
      setProfileError("");
      setToast("Sauvegarde Input reconnue. Le profil peut être généré.");
    } catch (error) {
      setSourceProfile(null);
      setSourceFileName("");
      setProfileInfo(null);
      setProfileError(error instanceof Error ? error.message : "Fichier Input invalide.");
    }
  };

  const exportMapping = () => {
    if (!sourceProfile) {
      profileInputRef.current?.click();
      setToast("Chargez d’abord la sauvegarde officielle de votre profil Input.");
      return;
    }

    try {
      const { profile } = buildInputProfile(sourceProfile, mapping);
      const blob = new Blob([`${JSON.stringify(profile, null, 2)}\n`], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "Claude-macOS-profile.json";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setToast("Profil Input créé. Importez-le avec « Add New » dans Input.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Génération impossible.");
    }
  };

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 3000);
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
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
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

  return (
    <main className="app-shell">
      <div
        className="page-content"
        inert={panelOpen ? true : undefined}
        aria-hidden={panelOpen ? "true" : undefined}
      >
        <header className="topbar">
          <a className="brand" href="#configurateur" aria-label="Codex Micro, accueil">
            <span className="brand-mark">C</span>
            <span>Codex Micro</span>
          </a>
          <span className="local-status">
            <span aria-hidden="true" />
            {sourceProfile ? "Sauvegarde vérifiée" : "Traitement local"}
          </span>
        </header>

        <section className="hero" id="configurateur">
          <div className="hero-copy">
            <span className="eyebrow">Contrôleur pour Claude Desktop</span>
            <h1>Vos raccourcis Claude, sous la main.</h1>
            <p>
              Choisissez une touche du Codex Micro et affectez-lui l’action Claude
              que vous utilisez le plus.
            </p>
          </div>

          <div className="device-stage">
            <div className="device-wrap">
              <img
                className="device-image"
                src="/assets/ai-controller-claude-v1.png"
                alt="Codex Micro translucide avec quatre touches, un joystick et une molette"
              />
              {CONTROLS.map((control) => {
                const action = ACTIONS[mapping[control.id]];
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
                    aria-label={`${control.label} : ${action.label}. Configurer`}
                    onClick={() => openConfigurator(control.id)}
                  >
                    <span>{action.exportLabel}</span>
                  </button>
                );
              })}
            </div>

            <button className="configure-button" onClick={() => openConfigurator("key-1")}>
              <SlidersHorizontal size={18} />
              Configurer les touches
              <ChevronRight size={18} />
            </button>
          </div>

          <button className="generate-button" onClick={exportMapping}>
            <ArrowDownToLine size={18} />
            Générer le JSON
          </button>

          <div className="mapping-preview" aria-label="Mapping actuel">
            {CONTROLS.map((control) => {
              const action = ACTIONS[mapping[control.id]];
              return (
                <button key={control.id} onClick={() => openConfigurator(control.id)}>
                  <span>{control.shortLabel}</span>
                  <strong>{action.exportLabel}</strong>
                </button>
              );
            })}
          </div>

          <p className="quiet-note">
            Votre sauvegarde reste dans ce navigateur. Le profil généré s’importe
            ensuite avec « Add New » dans Work Louder Input.
          </p>
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
            <span>Configuration Claude</span>
            <h2 id="mapping-dialog-title">{selectedControl.label}</h2>
          </div>
          <button
            ref={closeButtonRef}
            className="icon-button"
            aria-label="Fermer le configurateur"
            onClick={closeConfigurator}
          >
            <X size={22} />
          </button>
        </div>

        <div className="dialog-scroll">
          <div className="control-tabs" aria-label="Choisir un contrôle">
            {CONTROLS.map((control) => (
              <button
                key={control.id}
                className={control.id === selectedControl.id ? "is-active" : ""}
                aria-pressed={control.id === selectedControl.id}
                onClick={() => setSelectedControlId(control.id)}
              >
                <span>{control.shortLabel}</span>
                <strong>{ACTIONS[mapping[control.id]].exportLabel}</strong>
              </button>
            ))}
          </div>

          <section className="action-picker" aria-labelledby="action-picker-title">
            <div className="section-label">
              <h3 id="action-picker-title">Action</h3>
              <kbd>{selectedAction.shortcut}</kbd>
            </div>

            <div className="action-list">
              {availableActions.map((action) => {
                const Icon = action.icon;
                const active = selectedAction.id === action.id;
                return (
                  <button
                    key={action.id}
                    className={active ? "is-active" : ""}
                    aria-pressed={active}
                    onClick={() => assignAction(action.id)}
                  >
                    <span className="action-icon">
                      <Icon size={19} />
                    </span>
                    <span className="action-copy">
                      <strong>{action.label}</strong>
                      <small>{action.description}</small>
                    </span>
                    <kbd>{action.shortcut}</kbd>
                    <span className="check-slot" aria-hidden="true">
                      {active && <Check size={18} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="profile-loader" aria-labelledby="profile-loader-title">
            <div className="profile-loader-copy">
              <span className="profile-loader-icon" aria-hidden="true">
                {profileInfo ? <ShieldCheck size={20} /> : <FileJson size={20} />}
              </span>
              <span>
                <strong id="profile-loader-title">
                  {profileInfo ? "Sauvegarde Input vérifiée" : "Charger la sauvegarde Input"}
                </strong>
                <small>
                  {profileInfo
                    ? `${sourceFileName} · layer ${profileInfo.layerName} · AppSense ${
                        profileInfo.appSenseLinked ? "conservé" : "non lié"
                      }`
                    : "Exportez d’abord le profil actif depuis Input 0.17.x."}
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
              {profileInfo ? "Remplacer" : "Choisir le JSON"}
            </button>
            {profileError && (
              <p className="profile-error" role="alert">
                {profileError}
              </p>
            )}
          </section>

          <p className="panel-note">
            Le layer natif, les autres layers et le lien AppSense sont préservés.
            L’import ajoute un nouveau profil « Claude macOS » : votre sauvegarde
            reste disponible pour revenir en arrière.
          </p>
        </div>

        <div className="dialog-footer">
          <button className="reset-button" onClick={resetMapping}>
            <RotateCcw size={17} />
            Restaurer
          </button>
          <button className="export-button" onClick={exportMapping}>
            <ArrowDownToLine size={18} />
            {sourceProfile ? "Générer le profil" : "Charger le profil"}
          </button>
        </div>
      </aside>

      {panelOpen && (
        <button
          className="dialog-scrim"
          aria-label="Fermer le configurateur"
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
