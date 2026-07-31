export function createProfileSession() {
  return {
    source: null,
    fileName: "",
    info: null,
    error: null,
    mappingConflict: null,
    layerCreated: null,
    review: null,
    appSenseIds: { claude: "", base: "" },
  };
}

export function profileSessionReducer(state, action) {
  switch (action.type) {
    case "profile-loaded":
      return {
        ...state,
        source: action.payload.source,
        fileName: action.payload.fileName,
        info: action.payload.info,
        layerCreated: action.payload.layerCreated,
        mappingConflict: action.payload.mappingConflict,
        error: null,
        review: null,
      };
    case "profile-failed":
      return { ...state, error: action.error };
    case "conflict-resolved":
      return state.mappingConflict ? { ...state, mappingConflict: null } : state;
    case "appsense-changed":
      if (action.field !== "claude" && action.field !== "base") {
        throw new Error(`Unknown AppSense field: ${action.field}`);
      }
      return {
        ...state,
        appSenseIds: { ...state.appSenseIds, [action.field]: action.value },
        review: null,
      };
    case "review-ready":
      return { ...state, review: action.review, error: null };
    case "review-failed":
      return { ...state, review: null, error: action.error };
    case "review-invalidated":
      return state.review ? { ...state, review: null } : state;
    default:
      throw new Error(`Unknown profile session action: ${action.type}`);
  }
}
