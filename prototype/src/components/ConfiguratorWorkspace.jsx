import { memo } from "react";
import {
  ArrowDownToLine,
  ChevronRight,
  Monitor,
  Moon,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Sun,
} from "lucide-react";
import { LEGEND_ORDER, STATE_COLORS } from "../../../shared/thread-status-palette.mjs";
import {
  CONTROLS,
  KEYCAP_TONES,
  RESERVED_ZONES,
} from "../configurator-catalog.jsx";
import {
  controlBadgeLabel,
  controlLabel,
  entryExportLabel,
  entryFor,
  entryIcon,
  entryLabel,
} from "../configurator-presenter.js";
import { LOCALE_LABELS } from "../i18n/index.js";

const THEME_ICONS = Object.freeze({ auto: Monitor, light: Sun, dark: Moon });

const Topbar = memo(function Topbar({
  t,
  locale,
  theme,
  sourceProfileLoaded,
  onCycleTheme,
  onLocaleChange,
}) {
  const ThemeIcon = THEME_ICONS[theme] ?? Monitor;
  return (
    <header className="topbar">
      <a className="brand" href="#configurateur" aria-label={t("topbar.brandHome")}>
        <span className="brand-mark">C</span>
        <span>Codex Micro</span>
      </a>
      <div className="topbar-tools">
        <button
          type="button"
          className="theme-toggle"
          onClick={onCycleTheme}
          aria-label={t(`topbar.theme.${theme}`)}
          title={t(`topbar.theme.${theme}`)}
        >
          <ThemeIcon size={15} aria-hidden="true" />
        </button>
        <select
          className="language-select"
          aria-label={t("topbar.languageLabel")}
          value={locale}
          onChange={(event) => onLocaleChange(event.target.value)}
        >
          {Object.entries(LOCALE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <span className="local-status">
          <span aria-hidden="true" />
          {sourceProfileLoaded
            ? t("topbar.backupVerified")
            : t("topbar.localProcessing")}
        </span>
      </div>
    </header>
  );
});

const StateLegend = memo(function StateLegend({ t }) {
  return (
    <details className="state-legend">
      <summary className="state-legend-title">
        {t("stateLegend.title")}
        <span className="state-legend-badge">{t("stateLegend.experimental")}</span>
      </summary>
      <ul className="state-legend-list">
        {LEGEND_ORDER.map((state) => (
          <li key={state} className="state-legend-item">
            <span
              className={`state-legend-swatch ${STATE_COLORS[state] ? "" : "is-off"}`}
              style={STATE_COLORS[state] ? { background: STATE_COLORS[state] } : undefined}
              aria-hidden="true"
            />
            <span className="state-legend-label">{t(`stateLegend.states.${state}`)}</span>
            <code className="state-legend-hex">
              {STATE_COLORS[state] ?? t("stateLegend.off")}
            </code>
          </li>
        ))}
      </ul>
      <p className="state-legend-note">{t("stateLegend.note")}</p>
    </details>
  );
});

export const ConfiguratorWorkspace = memo(function ConfiguratorWorkspace({
  t,
  locale,
  theme,
  mapping,
  selectedControlId,
  panelOpen,
  sourceProfileLoaded,
  onCycleTheme,
  onLocaleChange,
  onOpenConfigurator,
  onOpenExport,
}) {
  return (
    <>
      <div className="page-content">
        <Topbar
          t={t}
          locale={locale}
          theme={theme}
          sourceProfileLoaded={sourceProfileLoaded}
          onCycleTheme={onCycleTheme}
          onLocaleChange={onLocaleChange}
        />

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
              {CONTROLS.map((control) => {
                const entry = entryFor(mapping, control.id);
                const EntryIcon = entryIcon(entry);
                return (
                  <button
                    key={control.id}
                    type="button"
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
                      control: controlLabel(control, t),
                      action: entryLabel(entry, t),
                    })}
                    onClick={() => onOpenConfigurator(control.id)}
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
                  <span>{t("device.reservedTip")}</span>
                </span>
              ))}
            </div>

            <button
              type="button"
              className="configure-button"
              onClick={() => onOpenConfigurator("key-1")}
            >
              <SlidersHorizontal size={18} />
              {t("buttons.configureKeys")}
              <ChevronRight size={18} />
            </button>
          </div>

          <button type="button" className="generate-button" onClick={onOpenExport}>
            <ArrowDownToLine size={18} />
            {t("buttons.generateJson")}
          </button>

          <div className="mapping-preview" aria-label={t("dialog.mappingLabel")}>
            {CONTROLS.map((control) => {
              const entry = entryFor(mapping, control.id);
              const exportLabel = entryExportLabel(entry);
              return (
                <button
                  key={control.id}
                  type="button"
                  aria-label={t("hotspot.configure", {
                    control: controlLabel(control, t),
                    action: entryLabel(entry, t),
                  })}
                  onClick={() => onOpenConfigurator(control.id)}
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

      <StateLegend t={t} />
    </>
  );
});
