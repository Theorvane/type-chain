import assert from "node:assert/strict";
import test from "node:test";
import { FakeToolCallingModel } from "langchain";
import {
  ExternalApiServer,
  FakeExternalApiClient,
} from "../.test-dist/test-fixtures/typemcp.fixture.js";

import {
  createTypeMcpAgent,
  createTypeMcpLangChainTools,
} from "../dist/typemcp.js";

test("composes a resolver-backed TypeMCP external API tool in process", async () => {
  const tools = await createTypeMcpLangChainTools(ExternalApiServer, {
    resolver: {
      resolve: () => new ExternalApiServer(new FakeExternalApiClient()),
    },
  });

  assert.equal(tools.length, 1);
  assert.equal(tools[0]?.name, "search_issues");
  assert.equal(
    await tools[0]?.invoke({ query: "bridge" }),
    "external-api:bridge",
  );
  await assert.rejects(() => tools[0]?.invoke({ query: "" }));
});

test("builds an agent that invokes the resolver-backed TypeMCP external API tool", async () => {
  const model = new FakeToolCallingModel({
    toolCalls: [
      [
        {
          id: "search-call",
          name: "search_issues",
          args: { query: "agent" },
        },
      ],
      [],
    ],
  });
  const agent = await createTypeMcpAgent({
    model,
    server: ExternalApiServer,
    resolver: {
      resolve: () => new ExternalApiServer(new FakeExternalApiClient()),
    },
  });

  const result = await agent.invoke({
    messages: [{ role: "user", content: "Search the external issue API." }],
  });
  const toolResult = result.messages.find(
    (message) =>
      message.type === "tool" && message.tool_call_id === "search-call",
  );

  assert.equal(toolResult?.content, "external-api:agent");
});
