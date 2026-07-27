import assert from "node:assert/strict";
import test from "node:test";
import { FakeToolCallingModel } from "langchain";

import {
  ExternalApiServer,
  FakeExternalApiClient,
} from "../.test-dist/test-fixtures/typemcp.fixture.js";
import {
  createGuardedTypeMcpAgent,
  createGuardedTypeMcpLangChainTools,
} from "../dist/typemcp.js";

function createResolver(client) {
  return {
    resolve: () => new ExternalApiServer(client),
  };
}

function createModel(name, args) {
  return new FakeToolCallingModel({
    toolCalls: [[{ id: "tool-call", name, args }], []],
  });
}

test("rejects a non-function TypeMCP guard", async () => {
  await assert.rejects(
    () =>
      createGuardedTypeMcpLangChainTools(
        ExternalApiServer,
        { resolver: createResolver(new FakeExternalApiClient()) },
        null,
      ),
    /typemcp tool guard must be a function/i,
  );
});

test("runs an application guard before an in-process TypeMCP agent tool", async () => {
  const guardCalls = [];
  const agent = await createGuardedTypeMcpAgent({
    model: createModel("search_issues", { query: "guarded" }),
    server: ExternalApiServer,
    resolver: createResolver(new FakeExternalApiClient()),
    guard: async (context) => {
      guardCalls.push(context);
    },
  });

  const result = await agent.invoke({
    messages: [{ role: "user", content: "Search guarded issues." }],
  });
  const toolResult = result.messages.find(
    (message) =>
      message.type === "tool" && message.tool_call_id === "tool-call",
  );

  assert.equal(toolResult?.content, "external-api:guarded");
  assert.deepEqual(guardCalls, [
    {
      name: "search_issues",
      description: "Search issues through an external API.",
      input: { query: "guarded" },
    },
  ]);
  assert.equal(Object.isFrozen(guardCalls[0]), true);
});

test("prevents a TypeMCP guard from mutating resolver input through its context", async () => {
  const client = {
    received: undefined,
    async searchIssues({ query }) {
      this.received = query;
      return `external-api:${query}`;
    },
  };
  const tools = await createGuardedTypeMcpLangChainTools(
    ExternalApiServer,
    { resolver: createResolver(client) },
    ({ input }) => {
      input.query = "changed-by-guard";
    },
  );

  await assert.rejects(
    () => tools[0].invoke({ query: "original" }),
    /read only|not extensible|frozen/i,
  );
  assert.equal(client.received, undefined);
});

test("prevents a TypeMCP resolver method when its agent guard rejects", async () => {
  const client = {
    calls: 0,
    async searchIssues({ query }) {
      this.calls += 1;
      return `external-api:${query}`;
    },
  };
  const agent = await createGuardedTypeMcpAgent({
    model: createModel("search_issues", { query: "blocked" }),
    server: ExternalApiServer,
    resolver: createResolver(client),
    guard: () => {
      throw new Error("Application approval denied.");
    },
  });

  const result = await agent.invoke({
    messages: [{ role: "user", content: "Search blocked issues." }],
  });
  const toolResult = result.messages.find(
    (message) =>
      message.type === "tool" && message.tool_call_id === "tool-call",
  );

  assert.match(String(toolResult?.content), /application approval denied/i);
  assert.equal(client.calls, 0);
});
