import assert from "node:assert/strict";
import test from "node:test";
import { FakeToolCallingModel } from "langchain";

import {
  ExternalApiServer,
  FakeExternalApiClient,
  RichInputServer,
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

test("normalizes mutable rich inputs into an immutable guard snapshot", async () => {
  const server = new RichInputServer();
  const tools = await createGuardedTypeMcpLangChainTools(
    RichInputServer,
    { resolver: { resolve: () => server } },
    ({ input }) => {
      assert.deepEqual(input, {
        at: { type: "date", value: "2026-07-27T00:00:00.000Z" },
        labels: { type: "map", entries: [["priority", 1]] },
        values: { type: "set", values: ["release"] },
        bytes: { type: "Uint8Array", bytes: [4, 5] },
      });
      assert.equal(Object.isFrozen(input.at), true);
      assert.equal(Object.isFrozen(input.labels.entries), true);
      assert.equal(Object.isFrozen(input.values.values), true);
      assert.equal(Object.isFrozen(input.bytes.bytes), true);
    },
  );
  const input = {
    at: new Date("2026-07-27T00:00:00.000Z"),
    labels: new Map([["priority", 1]]),
    values: new Set(["release"]),
    bytes: new Uint8Array([4, 5]),
  };

  assert.equal(await tools[0].invoke(input), "inspected");
  assert.deepEqual(server.observed, input);
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
