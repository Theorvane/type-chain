import assert from "node:assert/strict";
import test from "node:test";

import { FakeToolCallingModel } from "langchain";
import { buildAgent } from "../.test-dist/src/agent.js";
import { createDecoratedFixture } from "../.test-dist/test-fixtures/actual-decorator.fixture.js";

test("collects metadata registered by actual standard TypeScript decorators", async () => {
  const { definitions, instance, schema } = createDecoratedFixture();

  assert.equal(definitions.length, 1);
  assert.equal(definitions[0]?.name, "actual_search");
  assert.equal(definitions[0]?.schema, schema);
  assert.equal(await definitions[0]?.invoke({ query: "42" }), "actual:42");

  const agent = buildAgent(instance, {
    model: new FakeToolCallingModel({
      toolCalls: [
        [
          {
            args: { query: "fixture" },
            id: "fixture-call",
            name: "actual_search",
          },
        ],
        [],
      ],
    }),
  });
  const result = await agent.invoke({
    messages: [{ content: "Search the fixture.", role: "user" }],
  });
  const toolMessage = result.messages.find(
    (message) => message.getType() === "tool",
  );

  assert.equal(toolMessage?.content, "actual:fixture");
});
