import {
  addClaudeLayer,
  buildInputProfile,
  deriveMappingFromProfile,
  inspectInputProfile,
} from "../../shared/input-profile.mjs";
import { parseOptionalNonNegativeInteger } from "./configurator-state.js";
import { LOCALES } from "./i18n/index.js";

export function prepareImportedProfile(parsed) {
  let source = parsed;
  let layerCreated = null;
  let info;

  try {
    info = inspectInputProfile(source, { requireAppSense: false });
  } catch (error) {
    if (error?.code !== "NO_CLAUDE_LAYER") throw error;
    const synthesized = addClaudeLayer(parsed);
    source = synthesized.source;
    layerCreated = { templateName: synthesized.templateName };
    info = inspectInputProfile(source, { requireAppSense: false });
  }

  return {
    source,
    info,
    layerCreated,
    derived: deriveMappingFromProfile(source),
  };
}

export async function sha256Hex(text, crypto = globalThis.window?.crypto) {
  try {
    const digest = await crypto?.subtle?.digest(
      "SHA-256",
      new TextEncoder().encode(text),
    );
    if (!digest) return "";
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  } catch {
    return "";
  }
}

export async function createProfileReview(source, mapping, appSenseIds, crypto) {
  const { profile, report } = buildInputProfile(source, mapping, {
    requireAppSense: false,
    appSenseId: parseOptionalNonNegativeInteger(appSenseIds.claude),
    baseLayerAppSenseId: parseOptionalNonNegativeInteger(appSenseIds.base),
  });
  const json = `${JSON.stringify(profile, null, 2)}\n`;
  return { json, sha: await sha256Hex(json, crypto), report };
}

export function describeProfileError(error, t) {
  if (error instanceof SyntaxError) {
    return { message: t("errors.invalidJson"), code: null };
  }
  if (error?.code && LOCALES.fr.errors[error.code]) {
    return { message: t(`errors.${error.code}`), code: error.code };
  }
  return {
    message: error instanceof Error ? error.message : t("errors.invalidFile"),
    code: null,
  };
}
