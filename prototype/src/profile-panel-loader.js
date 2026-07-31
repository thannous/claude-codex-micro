let profilePanelPromise;

export function loadProfileExportPanel() {
  profilePanelPromise ??= import("./components/ProfileExportPanel.jsx");
  return profilePanelPromise;
}
