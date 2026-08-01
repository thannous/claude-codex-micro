import {
  addClaudeLayer,
  buildInputProfile,
  deriveMappingFromProfile,
  inspectInputProfile,
} from "../../shared/input-profile.mjs";
import { parseOptionalNonNegativeInteger } from "./configurator-state.js";
import { LOCALES } from "./i18n/index.js";

/**
 * Normalizes an imported profile for the configurator. A missing Claude layer
 * is synthesized from a compatible template; every other inspection failure is
 * preserved for the caller to present.
 *
 * @param {object} parsed Parsed Work Louder Input profile export.
 * @returns {{source: object, info: object, layerCreated: {templateName: string}|null, derived: {mapping: object, assigned: number}}}
 * Prepared immutable workflow input and its derived mapping.
 * @throws {Error} When the profile is unsafe or cannot supply a layer template.
 */
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

/**
 * Computes a browser-compatible SHA-256 digest without making hashing a hard
 * requirement. Unavailable or rejected Web Crypto returns an empty string.
 *
 * @param {string} text UTF-8 text to hash.
 * @param {Crypto} [crypto] Injectable Web Crypto implementation.
 * @returns {Promise<string>} Lowercase hexadecimal digest, or `""` on failure.
 */
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

/**
 * Builds the reviewed downloadable profile and binds its exact serialized JSON
 * to a SHA-256 fingerprint when Web Crypto is available.
 *
 * @param {object} source Prepared official profile export.
 * @param {object} mapping Canonical configurator mapping.
 * @param {{claude: string, base: string}} appSenseIds User-entered local ids.
 * @param {Crypto} [crypto] Injectable Web Crypto implementation.
 * @returns {Promise<{json: string, sha: string, report: object}>} Download data
 * and the transformer's preservation report.
 * @throws {Error} When profile generation violates a safety invariant.
 */
export async function createProfileReview(source, mapping, appSenseIds, crypto) {
  const { profile, report } = buildInputProfile(source, mapping, {
    requireAppSense: false,
    appSenseId: parseOptionalNonNegativeInteger(appSenseIds.claude),
    baseLayerAppSenseId: parseOptionalNonNegativeInteger(appSenseIds.base),
  });
  const json = `${JSON.stringify(profile, null, 2)}\n`;
  return { json, sha: await sha256Hex(json, crypto), report };
}

/**
 * Converts parser and domain failures into a stable, localized UI error shape.
 * Unknown `Error` instances retain their message; non-errors use the generic
 * invalid-file translation.
 *
 * @param {unknown} error Failure raised while loading or transforming a profile.
 * @param {(key: string) => string} t Locale translator.
 * @returns {{message: string, code: string|null}} User-facing message and
 * optional stable domain code.
 */
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
