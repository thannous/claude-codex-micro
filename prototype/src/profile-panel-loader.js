import { createRetryableLoader } from "./retryable-loader.js";

export const loadProfileExportPanel = createRetryableLoader(
  () => import("./components/ProfileExportPanel.jsx"),
);
