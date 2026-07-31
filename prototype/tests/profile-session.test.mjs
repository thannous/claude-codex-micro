import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_MAPPING } from "../../shared/input-profile.mjs";
import { sourceProfile } from "../../tests/helpers/input-profile-fixture.mjs";
import {
  createProfileSession,
  profileSessionReducer,
} from "../src/profile-session.js";
import {
  createProfileReview,
  describeProfileError,
  prepareImportedProfile,
  sha256Hex,
} from "../src/profile-workflow.js";

const t = (key) => `translated:${key}`;

test("keeps profile workflow transitions atomic and invalidates stale reviews", () => {
  const initial = createProfileSession();
  const source = sourceProfile();
  const loaded = profileSessionReducer(initial, {
    type: "profile-loaded",
    payload: {
      source,
      fileName: "profile.json",
      info: { layerName: "Claude" },
      layerCreated: null,
      mappingConflict: { mapping: DEFAULT_MAPPING },
    },
  });
  assert.equal(loaded.source, source);
  assert.equal(loaded.fileName, "profile.json");

  const reviewed = profileSessionReducer(loaded, {
    type: "review-ready",
    review: { json: "{}" },
  });
  const changed = profileSessionReducer(reviewed, {
    type: "appsense-changed",
    field: "claude",
    value: "7",
  });
  assert.equal(changed.appSenseIds.claude, "7");
  assert.equal(changed.review, null);
  assert.equal(profileSessionReducer(changed, { type: "review-invalidated" }), changed);
  assert.throws(
    () => profileSessionReducer(changed, {
      type: "appsense-changed",
      field: "unknown",
      value: "1",
    }),
    /Unknown AppSense field/,
  );

  const resolved = profileSessionReducer(changed, { type: "conflict-resolved" });
  assert.equal(resolved.mappingConflict, null);
  const failed = profileSessionReducer(resolved, {
    type: "review-failed",
    error: { message: "failed" },
  });
  assert.equal(failed.error.message, "failed");
  assert.equal(
    profileSessionReducer(failed, { type: "profile-failed", error: { message: "bad file" } })
      .error.message,
    "bad file",
  );
  assert.throws(() => profileSessionReducer(initial, { type: "unknown" }), /Unknown profile/);
});

test("prepares existing and newly synthesized Claude layers", () => {
  const existing = prepareImportedProfile(sourceProfile());
  assert.equal(existing.info.layerName, "Claude");
  assert.equal(existing.layerCreated, null);
  assert.ok(existing.derived.assigned > 0);

  const missing = sourceProfile();
  missing.profile.layers[1].name = "Template";
  const synthesized = prepareImportedProfile(missing);
  assert.equal(synthesized.info.layerName, "Claude");
  assert.equal(synthesized.layerCreated.templateName, "Template");
  assert.equal(synthesized.source.profile.layers.length, 3);
});

test("hashes and builds a review with injectable browser crypto", async () => {
  const crypto = {
    subtle: {
      async digest(algorithm, bytes) {
        assert.equal(algorithm, "SHA-256");
        assert.ok(bytes.length > 0);
        return Uint8Array.from([0, 15, 255]).buffer;
      },
    },
  };
  assert.equal(await sha256Hex("profile", crypto), "000fff");
  assert.equal(await sha256Hex("profile", null), "");
  assert.equal(
    await sha256Hex("profile", { subtle: { digest: async () => { throw new Error("blocked"); } } }),
    "",
  );

  const review = await createProfileReview(
    sourceProfile(),
    DEFAULT_MAPPING,
    { claude: "", base: "" },
    crypto,
  );
  assert.match(review.json, /"Claude macOS"/);
  assert.equal(review.sha, "000fff");
  assert.equal(review.report.nativeLayerPreserved, true);
});

test("normalizes syntax, coded, generic, and unknown profile errors", () => {
  assert.deepEqual(describeProfileError(new SyntaxError("bad"), t), {
    message: "translated:errors.invalidJson",
    code: null,
  });
  const coded = new Error("wrong");
  coded.code = "WRONG_DEVICE";
  assert.deepEqual(describeProfileError(coded, t), {
    message: "translated:errors.WRONG_DEVICE",
    code: "WRONG_DEVICE",
  });
  assert.deepEqual(describeProfileError(new Error("plain"), t), {
    message: "plain",
    code: null,
  });
  assert.deepEqual(describeProfileError(null, t), {
    message: "translated:errors.invalidFile",
    code: null,
  });
});
