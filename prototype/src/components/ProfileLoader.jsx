import { FileJson, ShieldCheck } from "lucide-react";
import {
  GUIDE_URL,
  INPUT_RELEASES_URL,
} from "../configurator-catalog.jsx";
import { LOCALES } from "../i18n/index.js";

export function ProfileLoader({
  t,
  loaderRef,
  profileInputRef,
  profile,
  onLoadSourceProfile,
  onResolveMappingConflict,
}) {
  return (
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
            {profile.info ? <ShieldCheck size={20} /> : <FileJson size={20} />}
          </span>
          <span>
            <strong id="profile-loader-title">
              {profile.info ? t("loader.titleVerified") : t("loader.titleLoad")}
            </strong>
            <small>
              {profile.info
                ? t("loader.meta", {
                    file: profile.fileName,
                    layer: profile.info.layerName,
                    appSense: profile.info.appSenseLinked
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
          onChange={onLoadSourceProfile}
          hidden
        />
        <button
          type="button"
          className="profile-load-button"
          onClick={() => profileInputRef.current?.click()}
        >
          {profile.info ? t("buttons.replace") : t("buttons.chooseJson")}
        </button>
        {profile.error && (
          <div className="profile-error" role="alert">
            <p>{profile.error.message}</p>
            {profile.error.code && LOCALES.fr.hints?.[profile.error.code] && (
              <p className="profile-hint">{t(`hints.${profile.error.code}`)}</p>
            )}
            {profile.source && (
              <p className="profile-error-note">{t("errors.previousKept")}</p>
            )}
          </div>
        )}
        {profile.mappingConflict && (
          <div className="profile-conflict" role="alert">
            <p>{t("conflict.message")}</p>
            <div className="profile-conflict-actions">
              <button
                type="button"
                className="profile-conflict-keep"
                onClick={() => onResolveMappingConflict(false)}
              >
                {t("conflict.keep")}
              </button>
              <button type="button" onClick={() => onResolveMappingConflict(true)}>
                {t("conflict.adopt")}
              </button>
            </div>
          </div>
        )}
        {profile.info && !profile.info.appSenseLinked && (
          <div className="profile-notice" role="status">
            {profile.layerCreated && (
              <p>
                {t("notice.layerCreated", {
                  template: profile.layerCreated.templateName,
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
  );
}
