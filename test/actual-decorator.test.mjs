import assert from "node:assert/strict";
import test from "node:test";

import { createDecoratedFixture } from "../.test-dist/test-fixtures/actual-decorator.fixture.js";

test("collects metadata registered by an actual standard TypeScript decorator", async () => {
  const { definitions, schema } = createDecoratedFixture();

  assert.equal(definitions.length, 1);
  assert.equal(definitions[0]?.name, "actual_search");
  assert.equal(definitions[0]?.schema, schema);
  assert.equal(await definitions[0]?.invoke({ query: "42" }), "actual:42");
});
