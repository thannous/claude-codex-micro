import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CircleAlert,
  Command,
  CopyPlus,
  ChevronsLeft,
  ChevronsRight,
  Diff,
  FileJson,
  Gauge,
  Keyboard,
  Mic,
  Minus,
  Monitor,
  Moon,
  MousePointer2,
  Move,
  RotateCcw,
  RotateCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  Sun,
  Volume2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  addClaudeLayer,
  buildInputProfile,
  deriveMappingFromProfile,
  DEFAULT_MAPPING,
  FINAL_KEYCODES,
  inspectInputProfile,
  PRINTABLE_KEYS,
  WHEEL_MODES,
} from "../../shared/input-profile.mjs";
import { LEGEND_ORDER, STATE_COLORS } from "../../shared/thread-status-palette.mjs";
import {
  LOCALES,
  LOCALE_LABELS,
  createTranslator,
  detectLocale,
  saveLocale,
} from "./i18n/index.js";

const THEME_STORAGE_KEY = "codex-micro-theme";
const THEME_ORDER = ["auto", "light", "dark"];
const THEME_ICONS = { auto: Monitor, light: Sun, dark: Moon };

function ClaudeMarkIcon({ size = 19, className = "" }) {
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

function detectTheme() {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_ORDER.includes(saved) ? saved : "auto";
  } catch (error) {
    return "auto";
  }
}

// Doit rester aligné sur le breakpoint mobile de styles.css.
const MOBILE_LAYOUT_QUERY = "(max-width: 760px)";

function useMobileLayout() {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia(MOBILE_LAYOUT_QUERY).matches,
  );

  useEffect(() => {
    const query = window.matchMedia(MOBILE_LAYOUT_QUERY);
    const handleChange = (event) => setIsMobile(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}

const GUIDE_URL =
  "https://github.com/thannous/claude-codex-micro/blob/main/docs/installation.md";
const INPUT_RELEASES_URL = "https://github.com/worklouder/input-releases/releases";

const CONTROLS = [
  {
    id: "wheel",
    // Identité du contrôle, pas un mode : la molette n'est plus en défilement
    // par défaut. Affiché uniquement quand aucune action n'est assignée.
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
];

const KEY_CONTROL_IDS = new Set(
  CONTROLS.filter((control) => control.type === "key").map((control) => control.id),
);

const RESERVED_ZONES = [
  { id: "sensor", x: 8.77, y: 74.3, w: 20.19, h: 18.63, round: true },
];

const KEYCAP_TONES = {
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
};

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
  // Cycle entre les sessions du Code tab. Control sur toutes les plateformes,
  // comme le documente Claude Desktop. Aucun raccourci ne choisit une session par
  // son rang : seul le cycle est adressable.
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

const KEY_ACTION_IDS = new Set(
  Object.values(ACTIONS)
    .filter((action) => action.controlTypes.includes("key"))
    .map((action) => action.id),
);
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
  Comma: ",",
  BracketLeft: "[",
  BracketRight: "]",
  Equal: "=",
  Minus: "−",
};
const FINAL_KEY_OPTIONS = Object.keys(FINAL_KEYCODES);
const DEFAULT_CUSTOM = { type: "custom", keys: ["Command", "K"] };

const MAPPING_STORAGE_KEY = "codex-micro-mapping";
const TOAST_DURATION_MS = 6000;

const isCustom = (entry) => typeof entry === "object" && entry !== null && entry.type === "custom";

// Le joystick accepte deux préréglages (`navigation`, `none`) ou une affectation
// par direction. 45° restent pris par la zone de fermeture en haut, les 315°
// restants se partagent : 78,75° à quatre directions, 39,4° à huit. Au-delà,
// viser au pouce devient hasardeux — la borne est ergonomique, pas technique.
const JOYSTICK_DIRECTION_COUNTS = [4, 8];

const isCustomJoystick = (entry) =>
  typeof entry === "object" && entry !== null && Array.isArray(entry.sectors);

// Géométrie reprise de `radialSectors` dans shared/input-profile.mjs : 45° pris
// par la zone de fermeture centrée sur le haut, puis les 315° restants partagés.
// Le dessin doit rester dérivé de ces constantes, jamais recopié à la main —
// sinon il finirait par mentir sur les angles réellement écrits dans le profil.
const JOYSTICK_CLOSE_ANGLE = 45 / 360;
const JOYSTICK_START_ANGLE = (90 - 45 / 2) / 360;

function joystickGeometry(directions) {
  const sectorAngle = (1 - JOYSTICK_CLOSE_ANGLE) / directions;
  return Array.from({ length: directions }, (_, index) => {
    const a1 = JOYSTICK_START_ANGLE + JOYSTICK_CLOSE_ANGLE + sectorAngle * index;
    return { index, a1: a1 % 1, a2: (a1 + sectorAngle) % 1 };
  });
}

// Repère mathématique : 0 à l'est, angles croissants dans le sens antihoraire.
// L'ordonnée est inversée pour compenser l'axe y descendant du SVG, ce qui place
// bien la zone de fermeture en haut comme le veut `radialSectors`.
function polar(cx, cy, radius, angle) {
  const radians = angle * 2 * Math.PI;
  return [cx + radius * Math.cos(radians), cy - radius * Math.sin(radians)];
}

function sectorPath(cx, cy, inner, outer, a1, a2) {
  const span = (a2 - a1 + 1) % 1;
  const large = span > 0.5 ? 1 : 0;
  const [x1, y1] = polar(cx, cy, outer, a1);
  const [x2, y2] = polar(cx, cy, outer, a2);
  const [x3, y3] = polar(cx, cy, inner, a2);
  const [x4, y4] = polar(cx, cy, inner, a1);
  return [
    `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `A ${outer} ${outer} 0 ${large} 0 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    `A ${inner} ${inner} 0 ${large} 1 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function sectorCentroid(cx, cy, inner, outer, a1, a2) {
  const span = (a2 - a1 + 1) % 1;
  return polar(cx, cy, (inner + outer) / 2, (a1 + span / 2) % 1);
}

// Les pastilles reprennent la convention des keycaps : le numéro du secteur tant
// qu'il est libre, le libellé de l'action une fois affectée. Ce sont des `span`
// sans événements de pointeur : le seul contrôle est le secteur SVG dessous, ce
// qui évite deux éléments interactifs pour une même chose.
function JoystickDial({
  directions,
  sectors,
  selectedIndex,
  onSelect,
  badgeFor,
  sectorTitle,
  closeTitle,
}) {
  const size = 140;
  const center = size / 2;
  const inner = 32;
  const outer = 64;
  const geometry = joystickGeometry(directions);
  const closeA1 = JOYSTICK_START_ANGLE;
  const closeA2 = (JOYSTICK_START_ANGLE + JOYSTICK_CLOSE_ANGLE) % 1;
  const [closeX, closeY] = sectorCentroid(center, center, inner, outer, closeA1, closeA2);
  const percent = (value) => `${(value / size) * 100}%`;

  return (
    <div className="joystick-dial-wrap">
      <svg
        className="joystick-dial"
        viewBox={`0 0 ${size} ${size}`}
        role="group"
        aria-label={sectorTitle}
      >
        <title>{closeTitle}</title>
        <path
          className="joystick-dial-close"
          d={sectorPath(center, center, inner, outer, closeA1, closeA2)}
        />
        <text className="joystick-dial-glyph" x={closeX} y={closeY}>
          ✕
        </text>

        {geometry.map(({ index, a1, a2 }) => {
          const active = selectedIndex === index;
          return (
            <g
              key={index}
              className={`joystick-dial-sector${active ? " is-active" : ""}`}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              aria-label={`${sectorTitle} ${index + 1} : ${badgeFor(sectors[index], index).title}`}
              onClick={() => onSelect(index)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                onSelect(index);
              }}
            >
              <path d={sectorPath(center, center, inner, outer, a1, a2)} />
            </g>
          );
        })}
      </svg>

      {geometry.map(({ index, a1, a2 }) => {
        const [x, y] = sectorCentroid(center, center, inner, outer, a1, a2);
        const badge = badgeFor(sectors[index], index);
        return (
          <span
            key={index}
            className={`joystick-dial-badge${selectedIndex === index ? " is-active" : ""}${
              badge.assigned ? " is-assigned" : ""
            }`}
            style={{ left: percent(x), top: percent(y) }}
            aria-hidden="true"
          >
            {badge.label}
          </span>
        );
      })}
    </div>
  );
}

function makeCustomJoystick(directions, previous = []) {
  return {
    directions,
    sectors: Array.from({ length: directions }, (_, index) => previous[index] ?? "none"),
  };
}

function formatCustomKeys(keys) {
  const modifiers = keys.slice(0, -1);
  const finalKey = keys.at(-1);
  const modifierText = modifiers.map((key) => MODIFIER_SYMBOLS[key] ?? key).join("");
  return `${modifierText}${KEY_SYMBOLS[finalKey] ?? finalKey}`;
}

function isValidEntry(controlId, entry) {
  if (controlId === "joystick") {
    if (isCustomJoystick(entry)) {
      return (
        JOYSTICK_DIRECTION_COUNTS.includes(entry.directions) &&
        entry.sectors.length === entry.directions &&
        entry.sectors.every((sector) => isValidEntry("key-1", sector))
      );
    }
    return JOYSTICK_ACTION_IDS.has(entry);
  }
  if (controlId === "wheel") return typeof entry === "string" && entry in WHEEL_MODES;
  if (!KEY_CONTROL_IDS.has(controlId)) return false;
  if (isCustom(entry)) {
    return Array.isArray(entry.keys) && entry.keys.every((key) => typeof key === "string");
  }
  return KEY_ACTION_IDS.has(entry);
}

function mappingsEqual(a, b) {
  const controlIds = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const controlId of controlIds) {
    const entryA = JSON.stringify(a[controlId] ?? "none");
    const entryB = JSON.stringify(b[controlId] ?? "none");
    if (entryA !== entryB) return false;
  }
  return true;
}

function loadStoredState() {
  const fallback = { mapping: DEFAULT_MAPPING };
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
    return { mapping };
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
  const [theme, setTheme] = useState(detectTheme);
  const [mapping, setMapping] = useState(initialState.mapping);
  const [selectedControlId, setSelectedControlId] = useState("key-1");
  const [panelOpen, setPanelOpen] = useState(false);
  // "key" : édition de la touche sélectionnée. "export" : profil, vérification
  // et génération du JSON. Deux intentions distinctes, un seul panneau.
  const [panelMode, setPanelMode] = useState("key");
  const [toast, setToast] = useState("");
  const [sourceProfile, setSourceProfile] = useState(null);
  const [sourceFileName, setSourceFileName] = useState("");
  const [profileInfo, setProfileInfo] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [mappingConflict, setMappingConflict] = useState(null);
  const [layerCreated, setLayerCreated] = useState(null);
  const [review, setReview] = useState(null);
  // Références AppSense saisies par l'utilisateur. Chaînes vides = option non
  // passée au générateur, qui reprend alors ce que contient la sauvegarde.
  const [appSenseIds, setAppSenseIds] = useState({ claude: "", base: "" });
  // Direction du joystick en cours d'édition, `null` quand on choisit le mode.
  const [joystickSlot, setJoystickSlot] = useState(null);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const returnFocusRef = useRef(null);
  const profileInputRef = useRef(null);
  const loaderRef = useRef(null);
  const reviewRef = useRef(null);

  const t = useMemo(() => createTranslator(locale), [locale]);
  const isMobile = useMobileLayout();

  const controls = CONTROLS;
  const controlLabel = (control) => t(`controls.${control.id}`);
  const entryFor = (controlId) => mapping[controlId] ?? "none";
  const entryExportLabel = (entry) => {
    if (isCustomJoystick(entry)) return `${entry.directions} DIR`;
    return isCustom(entry) ? formatCustomKeys(entry.keys) : ACTIONS[entry].exportLabel;
  };
  const controlBadgeLabel = (control, entry) =>
    entry === "none" ? control.shortLabel : entryExportLabel(entry);
  const entryLabel = (entry) => {
    if (isCustomJoystick(entry)) return t("actions.joystickCustom.label");
    return isCustom(entry) ? t("actions.custom.label") : t(`actions.${entry}.label`);
  };
  const entryIcon = (entry) => {
    if (isCustomJoystick(entry)) return Move;
    return isCustom(entry) ? Keyboard : ACTIONS[entry].icon;
  };
  const entryShortcut = (entry) => {
    if (isCustomJoystick(entry)) {
      return t("actions.joystickCustom.shortcut", { count: entry.directions });
    }
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

  // Quand une direction du joystick est ouverte, le sélecteur travaille sur
  // elle et propose le catalogue des touches. Sans direction ouverte, le
  // joystick n'affiche que ses modes : la liste d'actions est alors vide.
  const editingJoystickSlot =
    selectedControl.type === "joystick" &&
    joystickSlot !== null &&
    isCustomJoystick(selectedEntry);
  const activeEntry = editingJoystickSlot ? selectedEntry.sectors[joystickSlot] : selectedEntry;
  const pickerActions = editingJoystickSlot
    ? Object.values(ACTIONS).filter((action) => action.controlTypes.includes("key"))
    : selectedControl.type === "joystick"
      ? []
      : availableActions;

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
    setPanelMode("key");
    setPanelOpen(true);
  };

  const switchToExport = () => {
    setPanelMode("export");
    if (sourceProfile) runReview();
  };

  const closeConfigurator = () => setPanelOpen(false);

  // Éditer une direction écrit dans le secteur visé, pas sur le contrôle : le
  // joystick reste une seule entrée du mapping.
  const assignEntry = (entry) => {
    setMapping((current) => {
      if (selectedControl.id !== "joystick" || joystickSlot === null) {
        return { ...current, [selectedControl.id]: entry };
      }
      const joystick = current.joystick;
      if (!isCustomJoystick(joystick)) return current;
      const sectors = joystick.sectors.map((sector, index) =>
        index === joystickSlot ? entry : sector,
      );
      return { ...current, joystick: { ...joystick, sectors } };
    });
  };

  const setJoystickMode = (mode) => {
    setJoystickSlot(null);
    setMapping((current) => {
      if (mode === "navigation" || mode === "none") {
        return { ...current, joystick: mode };
      }
      const previous = isCustomJoystick(current.joystick) ? current.joystick.sectors : [];
      return { ...current, joystick: makeCustomJoystick(mode, previous) };
    });
  };

  const resetMapping = () => {
    setMapping(DEFAULT_MAPPING);
    setMappingConflict(null);
    setToast(t("toasts.reset"));
  };

  const changeLocale = (nextLocale) => {
    setLocale(nextLocale);
    saveLocale(nextLocale);
  };

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "auto" ? (media.matches ? "dark" : "light") : theme;
    };
    apply();
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      // Private browsing: the preference just won't persist.
    }
    if (theme === "auto") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
  }, [theme]);

  const cycleTheme = () => {
    setTheme(
      (current) =>
        THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length],
    );
  };

  const ThemeIcon = THEME_ICONS[theme];

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
      let source = parsed;
      let created = null;
      let inspection;
      try {
        inspection = inspectInputProfile(source, { requireAppSense: false });
      } catch (error) {
        if (error?.code !== "NO_CLAUDE_LAYER") throw error;
        const synthesized = addClaudeLayer(parsed);
        source = synthesized.source;
        created = { templateName: synthesized.templateName };
        inspection = inspectInputProfile(source, { requireAppSense: false });
      }
      const derived = deriveMappingFromProfile(source);
      setSourceProfile(source);
      setSourceFileName(file.name);
      setProfileInfo(inspection);
      setLayerCreated(created);
      setProfileError(null);
      setMappingConflict(null);
      const derivedMapping = { ...DEFAULT_MAPPING, ...derived.mapping };
      if (derived.assigned === 0 || mappingsEqual(mapping, derivedMapping)) {
        setToast(t("toasts.loaded"));
      } else if (mappingsEqual(mapping, DEFAULT_MAPPING)) {
        setMapping(derivedMapping);
        setToast(t("toasts.loadedMapping"));
      } else {
        // Le mapping local a été personnalisé : ne pas l'écraser sans demander.
        setMappingConflict({
          mapping: derivedMapping,
        });
      }
    } catch (error) {
      setProfileError(describeError(error));
    }
  };

  const resolveMappingConflict = (adoptDerived) => {
    if (!mappingConflict) return;
    if (adoptDerived) {
      setMapping(mappingConflict.mapping);
      setToast(t("toasts.loadedMapping"));
    } else {
      setToast(t("toasts.keptMapping"));
    }
    setMappingConflict(null);
  };

  const runReview = async () => {
    if (!sourceProfile) {
      scrollToLoader();
      setToast(t("toasts.needProfile"));
      return;
    }

    const parseAppSenseId = (value) => {
      const trimmed = value.trim();
      if (trimmed === "") return undefined;
      const parsed = Number(trimmed);
      if (!Number.isInteger(parsed) || parsed < 0) {
        const error = new Error(t("errors.INVALID_APPSENSE_ID"));
        error.code = "INVALID_APPSENSE_ID";
        throw error;
      }
      return parsed;
    };

    try {
      const { profile, report } = buildInputProfile(sourceProfile, mapping, {
        requireAppSense: false,
        appSenseId: parseAppSenseId(appSenseIds.claude),
        baseLayerAppSenseId: parseAppSenseId(appSenseIds.base),
      });
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
    returnFocusRef.current = document.activeElement;
    setPanelOpen(true);
    switchToExport();
    if (!sourceProfile) scrollToLoader();
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
        JSON.stringify({ mapping }),
      );
    } catch {
      // Stockage indisponible : la configuration ne sera pas mémorisée.
    }
  }, [mapping]);

  // Le rapport décrit un mapping précis : toute modification l'invalide.
  useEffect(() => {
    setReview(null);
  }, [mapping, sourceProfile]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), TOAST_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  // Remonter la liste à chaque changement de contexte : nouveau mode, ouverture,
  // ou touche différente. Sans ça la liste reste au décalage précédent et son
  // premier élément apparaît coupé sous l'en-tête.
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

    // Le panneau est non modal sur les deux formats : le clavier reste visible
    // et utilisable à côté sur desktop, au-dessus sur mobile. Pas de piège à
    // focus, donc, seulement Échap pour fermer.
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeConfigurator();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [panelOpen, panelMode]);

  return (
    <main className={`app-shell${panelOpen ? " is-panel-open" : ""}`}>
      <div className="page-content">
        <header className="topbar">
          <a className="brand" href="#configurateur" aria-label={t("topbar.brandHome")}>
            <span className="brand-mark">C</span>
            <span>Codex Micro</span>
          </a>
          <div className="topbar-tools">
            <button
              type="button"
              className="theme-toggle"
              onClick={cycleTheme}
              aria-label={t(`topbar.theme.${theme}`)}
              title={t(`topbar.theme.${theme}`)}
            >
              <ThemeIcon size={15} aria-hidden="true" />
            </button>
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
            <p>{t("hero.subtitle")}</p>
          </div>

          <div className="device-stage">
            <div className="device-wrap">
              <img
                className="device-image"
                src="/assets/ai-controller-claude-v1-cutout.png"
                alt={t("device.alt")}
              />
              {controls.map((control) => {
                const entry = entryFor(control.id);
                const EntryIcon = entryIcon(entry);
                return (
                  <button
                    key={control.id}
                    className={`key-hotspot key-hotspot--${control.type}${
                      control.className ? ` ${control.className}` : ""
                    }${panelOpen && control.id === selectedControlId ? " is-selected" : ""}`}
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
                    {control.type === "key" && (
                      <span
                        className="keycap-action-asset"
                        style={{ "--keycap-tone": KEYCAP_TONES[control.id] }}
                        aria-hidden="true"
                      >
                        <EntryIcon size={control.id === "key-13" ? 13 : 19} strokeWidth={2} />
                      </span>
                    )}
                    <span
                      className={`key-hotspot-label${
                        control.id === "wheel" ? " key-hotspot-label--dial" : ""
                      }`}
                    >
                      {control.id === "wheel" && (
                        <RotateCcw size={8} strokeWidth={2.4} aria-hidden="true" />
                      )}
                      {controlBadgeLabel(control, entry)}
                      {control.id === "wheel" && (
                        <RotateCw size={8} strokeWidth={2.4} aria-hidden="true" />
                      )}
                    </span>
                  </button>
                );
              })}
              {RESERVED_ZONES.map((zone) => (
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
                    {t("device.reservedTip")}
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


      {/* Légende des couleurs d'état poussées sur les six touches Agent par
          `npm run lighting -- watch`. Les teintes viennent de la source unique
          partagée avec l'outillage Node, jamais réécrites ici.

          Hors du flux, en bas à gauche : la coque ne défile pas et la colonne
          centrale n'a plus un pixel avant la ligne de flottaison. Repliée par
          défaut, elle s'ouvre vers le haut. */}
      <details className="state-legend">
        <summary className="state-legend-title">{t("stateLegend.title")}</summary>
        <ul className="state-legend-list">
          {LEGEND_ORDER.map((state) => (
            <li key={state} className="state-legend-item">
              <span
                className={`state-legend-swatch ${STATE_COLORS[state] ? "" : "is-off"}`}
                style={STATE_COLORS[state] ? { background: STATE_COLORS[state] } : undefined}
                aria-hidden="true"
              />
              <span className="state-legend-label">{t(`stateLegend.states.${state}`)}</span>
              <code className="state-legend-hex">{STATE_COLORS[state] ?? t("stateLegend.off")}</code>
            </li>
          ))}
        </ul>
        <p className="state-legend-note">{t("stateLegend.note")}</p>
      </details>

      <aside
        ref={dialogRef}
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
                        control: controlLabel(selectedControl),
                        index: joystickSlot + 1,
                      })
                    : controlLabel(selectedControl)}
                </h2>
                <p className="key-header-current">
                  {entryLabel(activeEntry)}
                  <kbd>{entryShortcut(activeEntry)}</kbd>
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
            ref={closeButtonRef}
            className="icon-button"
            aria-label={t("dialog.close")}
            onClick={closeConfigurator}
          >
            <X size={22} />
          </button>
        </div>

        <div className="dialog-scroll">
          {panelMode === "export" && (
          <section
            ref={loaderRef}
            className="wizard-step"
            aria-labelledby="wizard-step-1-title"
          >
            <h3 id="wizard-step-1-title" className="wizard-step-title">
              {t("wizard.step1Title")}
            </h3>

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
              {mappingConflict && (
                <div className="profile-conflict" role="alert">
                  <p>{t("conflict.message")}</p>
                  <div className="profile-conflict-actions">
                    <button
                      type="button"
                      className="profile-conflict-keep"
                      onClick={() => resolveMappingConflict(false)}
                    >
                      {t("conflict.keep")}
                    </button>
                    <button type="button" onClick={() => resolveMappingConflict(true)}>
                      {t("conflict.adopt")}
                    </button>
                  </div>
                </div>
              )}
              {profileInfo && !profileInfo.appSenseLinked && (
                <div className="profile-notice" role="status">
                  {layerCreated && (
                    <p>
                      {t("notice.layerCreated", {
                        template: layerCreated.templateName,
                      })}
                    </p>
                  )}
                  <p className="profile-notice-todo">{t("notice.appSenseTodo")}</p>
                </div>
              )}
            </div>

            <p className="wizard-safety-note">
              <ShieldCheck size={15} aria-hidden="true" />
              <span>{t("loader.safetyNote")}</span>
            </p>

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
          )}

          {panelMode === "key" && (
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
                        onClick={() => setJoystickMode(mode)}
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
                      onSelect={(index) =>
                        setJoystickSlot(joystickSlot === index ? null : index)
                      }
                      badgeFor={(sector, index) => ({
                        assigned: sector !== "none",
                        label: sector === "none" ? index + 1 : entryExportLabel(sector),
                        title: entryLabel(sector),
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

                {(selectedControl.type === "key" || editingJoystickSlot) && (
                  <button
                    className={isCustom(activeEntry) ? "is-active" : ""}
                    aria-pressed={isCustom(activeEntry)}
                    onClick={() => {
                      if (!isCustom(activeEntry)) assignEntry(DEFAULT_CUSTOM);
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
                      {isCustom(activeEntry)
                        ? formatCustomKeys(activeEntry.keys)
                        : "⌘ …"}
                    </kbd>
                    <span className="check-slot" aria-hidden="true">
                      {isCustom(activeEntry) && <Check size={18} />}
                    </span>
                  </button>
                )}
              </div>

              {isCustom(activeEntry) && (
                <div className="custom-editor">
                  <div className="custom-editor-row">
                    <span className="custom-editor-label">
                      {t("picker.modifiersLabel")}
                    </span>
                    <div className="custom-modifiers">
                      {MODIFIERS.map((modifier) => {
                        const active = activeEntry.keys.slice(0, -1).includes(modifier);
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
                      value={activeEntry.keys.at(-1)}
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
            )}

          </>
          )}

          {panelMode === "export" && (
          <>
          <section
            ref={reviewRef}
            className="wizard-step"
            aria-labelledby="wizard-step-3-title"
          >
            <h3 id="wizard-step-3-title" className="wizard-step-title">
              {t("wizard.step3Title")}
            </h3>

            <fieldset className="appsense-fields">
              <legend>{t("appSense.legend")}</legend>
              <p className="appsense-hint">{t("appSense.hint")}</p>
              <label>
                <span>{t("appSense.claudeLabel")}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder={t("appSense.inherit")}
                  value={appSenseIds.claude}
                  onChange={(event) =>
                    setAppSenseIds((current) => ({ ...current, claude: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>{t("appSense.baseLabel")}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder={t("appSense.none")}
                  value={appSenseIds.base}
                  onChange={(event) =>
                    setAppSenseIds((current) => ({ ...current, base: event.target.value }))
                  }
                />
              </label>
              <p className="appsense-warning">{t("appSense.warning")}</p>
            </fieldset>

            {review ? (
              <div className="review-report" role="status">
                <ul className="review-checklist">
                  <li>
                    <Check size={15} aria-hidden="true" />
                    {t("review.nativePreserved")}
                  </li>
                  {review.report.appSenseLinked ? (
                    <li>
                      <Check size={15} aria-hidden="true" />
                      {t("review.appSensePreserved")}
                    </li>
                  ) : (
                    <li className="review-todo">
                      <CircleAlert size={15} aria-hidden="true" />
                      {t("review.appSenseTodo")}
                    </li>
                  )}
                  <li>
                    <Check size={15} aria-hidden="true" />
                    {t("review.layersPreserved", { count: review.report.preservedLayers })}
                  </li>
                  <li>
                    <Check size={15} aria-hidden="true" />
                    {t("review.createdActions", { count: review.report.createdActions })}
                  </li>
                  {review.report.assignedSwitches > 0 && (
                    <li>
                      <Check size={15} aria-hidden="true" />
                      {t("review.switchesAssigned", {
                        count: review.report.assignedSwitches,
                      })}
                    </li>
                  )}
                  {review.report.baseLayerAppSenseId !== null && (
                    <li>
                      <Check size={15} aria-hidden="true" />
                      {t("review.baseLayerLinked", {
                        id: review.report.baseLayerAppSenseId,
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
          </>
          )}
        </div>

        <div className="dialog-footer">
          {panelMode === "key" ? (
            <button className="export-button export-button--full" onClick={switchToExport}>
              {t("buttons.goExport")}
              <ChevronRight size={18} />
            </button>
          ) : (
            <>
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
            </>
          )}
        </div>
      </aside>

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <Check size={18} />
          {toast}
        </div>
      )}
    </main>
  );
}
