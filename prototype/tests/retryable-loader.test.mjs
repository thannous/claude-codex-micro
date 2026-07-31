import assert from "node:assert/strict";
import test from "node:test";
import { createRetryableLoader } from "../src/retryable-loader.js";

test("shares successful loads and retries after a rejected load", async () => {
  const loadedModule = { value: "ready" };
  let calls = 0;
  const load = createRetryableLoader(async () => {
    calls += 1;
    if (calls === 1) throw new Error("transient failure");
    return loadedModule;
  });

  const first = load();
  const concurrent = load();
  assert.equal(concurrent, first);
  await Promise.all([
    assert.rejects(first, /transient failure/),
    assert.rejects(concurrent, /transient failure/),
  ]);

  const retry = load();
  assert.notEqual(retry, first);
  assert.equal(await retry, loadedModule);
  assert.equal(load(), retry);
  assert.equal(calls, 2);
});

test("turns synchronous loader failures into retryable rejections", async () => {
  let calls = 0;
  const load = createRetryableLoader(() => {
    calls += 1;
    if (calls === 1) throw new Error("synchronous failure");
    return "ready";
  });

  await assert.rejects(load(), /synchronous failure/);
  assert.equal(await load(), "ready");
  assert.equal(calls, 2);
});
