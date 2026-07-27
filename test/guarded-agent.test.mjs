import assert from "node:assert/strict";
import test from "node:test";
import { FakeToolCallingModel } from "langchain";
import { z } from "zod";

import { Agent, buildGuardedAgent } from "../dist/agent.js";
import { Policy, Tool } from "../dist/index.js";

function applyMethodDecorators(instance, methodName, options, policy) {
  const initializers = [];
  const method = instance[methodName];

  for (const decorator of [Tool(options), Policy(policy)]) {
    decorator(method, {
      kind: "method",
      name: methodName,
      static: false,
      private: false,
      addInitializer(initializer) {
        initializers.push(initializer);
      },
    });
  }

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

function createModel(toolName, args) {
  return new FakeToolCallingModel({
    toolCalls: [[{ name: toolName, args, id: "call_1" }], []],
  });
}

test("builds a LangChain agent that invokes its application guard before a policy tool", async () => {
  class UpdateAgent {
    updates = [];

    update({ id }) {
      this.updates.push(id);
      return `updated:${id}`;
    }
  }

  applyClassDecorator(UpdateAgent, {
    systemPrompt: "Use the available tools.",
  });
  const instance = new UpdateAgent();
  applyMethodDecorators(
    instance,
    "update",
    {
      name: "update_issue",
      description: "Update an issue.",
      schema: z.object({ id: z.string().min(1) }),
    },
    { authorization: "required", approval: "required" },
  );

  const guardCalls = [];
  const agent = buildGuardedAgent(instance, {
    model: createModel("update_issue", { id: "42" }),
    guard: async ({ definition, input, policy }) => {
      guardCalls.push({ name: definition.name, input, policy });
    },
  });

  const result = await agent.invoke({
    messages: [{ role: "user", content: "Update issue 42." }],
  });
  const toolMessage = result.messages.find(
    (message) => message.getType() === "tool",
  );

  assert.equal(toolMessage?.content, "updated:42");
  assert.deepEqual(instance.updates, ["42"]);
  assert.deepEqual(guardCalls, [
    {
      name: "update_issue",
      input: { id: "42" },
      policy: { authorization: "required", approval: "required" },
    },
  ]);
});

test("blocks the decorated method when the guarded agent rejects its policy tool", async () => {
  class RemoveAgent {
    calls = 0;

    remove({ id }) {
      this.calls += 1;
      return `removed:${id}`;
    }
  }

  applyClassDecorator(RemoveAgent);
  const instance = new RemoveAgent();
  applyMethodDecorators(
    instance,
    "remove",
    {
      name: "remove_issue",
      description: "Remove an issue.",
      schema: z.object({ id: z.string().min(1) }),
    },
    { approval: "required" },
  );

  const agent = buildGuardedAgent(instance, {
    model: createModel("remove_issue", { id: "7" }),
    guard: () => {
      throw new Error("Approval denied.");
    },
  });

  const result = await agent.invoke({
    messages: [{ role: "user", content: "Remove issue 7." }],
  });
  const toolMessage = result.messages.find(
    (message) => message.getType() === "tool",
  );

  assert.match(String(toolMessage?.content), /approval denied/i);
  assert.equal(instance.calls, 0);
});
