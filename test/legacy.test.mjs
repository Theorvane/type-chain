import assert from "node:assert/strict";
import test from "node:test";

import { Policy } from "../dist/legacy.js";

test("legacy Policy preserves root policy validation", () => {
  assert.throws(
    () => Policy({ retry: { maxAttempts: 0 } }),
    /retry\.maxAttempts must be a positive safe integer/,
  );
  assert.throws(
    () => Policy({ authorization: "optional" }),
    /authorization must be "required" when set/,
  );
  assert.throws(() => Policy({ unexpected: true }), /unsupported field/);
});
