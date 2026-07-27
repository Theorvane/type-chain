import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

import { Policy, Tool } from "../dist/index.js";
import { toGuardedLangChainTools } from "../dist/langchain.js";

function collectInitializers(decorator, method, methodName) {
  const initializers = [];

  decorator(method, {
    kind: "method",
    name: methodName,
    static: false,
    private: false,
    addInitializer(initializer) {
      initializers.push(initializer);
    },
  });

  return initializers;
}

function decorate(instance, methodName, options, policy) {
  const method = instance[methodName];
  const decorators = [Tool(options)];

  if (policy !== undefined) {
    decorators.push(Policy(policy));
  }

  for (const decorator of decorators) {
    for (const initializer of collectInitializers(
      decorator,
      method,
      methodName,
    )) {
      initializer.call(instance);
    }
  }
}

test("runs an application guard before a policy-decorated LangChain tool", async () => {
  class IssueTools {
    updates = [];

    update({ id }) {
      this.updates.push(id);
      return `updated:${id}`;
    }
  }

  const instance = new IssueTools();
  decorate(
    instance,
    "update",
    {
      name: "update_issue",
      description: "Update an issue.",
      schema: z.object({ id: z.string().min(1) }),
    },
    { authorization: "required", approval: "required" },
  );

  const calls = [];
  const [tool] = toGuardedLangChainTools(instance, async (context) => {
    calls.push({ input: context.input, policy: context.policy });
  });

  assert.equal(await tool?.invoke({ id: "42" }), "updated:42");
  assert.deepEqual(calls, [
    {
      input: { id: "42" },
      policy: { authorization: "required", approval: "required" },
    },
  ]);
  assert.deepEqual(instance.updates, ["42"]);
});

test("bypasses the application guard for an unpolicied LangChain tool", async () => {
  class IssueTools {
    read({ id }) {
      return `issue:${id}`;
    }
  }

  const instance = new IssueTools();
  decorate(instance, "read", {
    name: "read_issue",
    description: "Read an issue.",
    schema: z.object({ id: z.string().min(1) }),
  });

  let guardCalls = 0;
  const [tool] = toGuardedLangChainTools(instance, () => {
    guardCalls += 1;
  });

  assert.equal(await tool?.invoke({ id: "7" }), "issue:7");
  assert.equal(guardCalls, 0);
});

test("preserves LangChain schema validation before the application guard", async () => {
  class IssueTools {
    update() {
      return "updated";
    }
  }

  const instance = new IssueTools();
  decorate(
    instance,
    "update",
    {
      name: "validated_update_issue",
      description: "Update an issue with a validated id.",
      schema: z.object({ id: z.string().min(1) }),
    },
    { approval: "required" },
  );

  let guardCalls = 0;
  const [tool] = toGuardedLangChainTools(instance, () => {
    guardCalls += 1;
  });

  await assert.rejects(() => tool?.invoke({ id: "" }));
  assert.equal(guardCalls, 0);
});

test("preserves a tool error after the LangChain guard allows invocation", async () => {
  const originalError = new Error("Application client failed.");

  class IssueTools {
    update() {
      throw originalError;
    }
  }

  const instance = new IssueTools();
  decorate(
    instance,
    "update",
    {
      name: "failing_update_issue",
      description: "Update an issue through a failing client.",
      schema: z.object({}),
    },
    { audit: "required" },
  );

  const [tool] = toGuardedLangChainTools(instance, () => undefined);

  await assert.rejects(
    () => tool?.invoke({}),
    (error) => {
      assert.equal(error, originalError);
      return true;
    },
  );
});

test("propagates guard denial without invoking the policy-decorated LangChain tool", async () => {
  class IssueTools {
    calls = 0;

    remove() {
      this.calls += 1;
      return "removed";
    }
  }

  const instance = new IssueTools();
  decorate(
    instance,
    "remove",
    {
      name: "remove_issue",
      description: "Remove an issue.",
      schema: z.object({}),
    },
    { approval: "required" },
  );

  const [tool] = toGuardedLangChainTools(instance, () => {
    throw new Error("Approval denied.");
  });

  await assert.rejects(() => tool?.invoke({}), /approval denied/i);
  assert.equal(instance.calls, 0);
});
