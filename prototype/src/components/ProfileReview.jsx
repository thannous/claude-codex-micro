import { ArrowDownToLine, Check, CircleAlert } from "lucide-react";

export function ProfileReview({
  t,
  reviewRef,
  profile,
  onAppSenseChange,
  onRunReview,
  onDownloadReview,
}) {
  const review = profile.review;

  return (
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
              value={profile.appSenseIds.claude}
              onChange={(event) => onAppSenseChange("claude", event.target.value)}
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
              value={profile.appSenseIds.base}
              onChange={(event) => onAppSenseChange("base", event.target.value)}
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
            <button
              type="button"
              className="review-download"
              onClick={onDownloadReview}
            >
              <ArrowDownToLine size={18} />
              {t("buttons.download")}
            </button>
          </div>
        ) : (
          <div className="review-empty">
            <p>{profile.source ? t("review.ready") : t("review.needProfile")}</p>
            <button
              type="button"
              className="review-run"
              disabled={!profile.source}
              onClick={onRunReview}
            >
              {t("buttons.review")}
            </button>
          </div>
        )}
      </section>

      <p className="panel-note">{t("panelNote")}</p>
    </>
  );
}
