import assert from "node:assert/strict";
import test from "node:test";
import { FakeToolCallingModel } from "langchain";
import { z } from "zod";
import { Agent, buildAgent, Tool } from "../dist/index.js";

function applyMethodDecorator(instance, methodName, options) {
  const initializers = [];
  const original = instance[methodName];
  Tool(options)(original, {
    kind: "method",
    name: methodName,
    static: false,
    private: false,
    addInitializer(initializer) {
      initializers.push(initializer);
    },
  });

  for (const initializer of initializers) {
    initializer.call(instance);
  }
}

function applyClassDecorator(Target, options) {
  const initializers = [];
  Agent(options)(Target, {
    kind: "class",
    name: Target.name,
    addInitializer(initializer) {
      initializers.push(initializer);
    },
  });

  for (const initializer of initializers) {
    initializer.call(Target);
  }
}

test("builds a real LangChain agent with class metadata and decorated tools", async () => {
  class SearchAgent {
    prefix = "agent:";

    async search({ query }) {
      return `${this.prefix}${query}`;
    }
  }

  applyClassDecorator(SearchAgent, {
    systemPrompt: "Use the available tools.",
  });
  const instance = new SearchAgent();
  applyMethodDecorator(instance, "search", {
    name: "search_issues",
    description: "Search repository issues.",
    schema: z.object({ query: z.string().min(1) }),
  });

  const agent = buildAgent(instance, {
    model: new FakeToolCallingModel({
      toolCalls: [
        [{ name: "search_issues", args: { query: "42" }, id: "call_1" }],
        [],
      ],
    }),
  });
  const result = await agent.invoke({
    messages: [{ role: "user", content: "Search issue 42." }],
  });

  const toolMessage = result.messages.find(
    (message) => message.getType() === "tool",
  );
  assert.equal(toolMessage?.content, "agent:42");
});
