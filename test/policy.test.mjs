import assert from "node:assert/strict";
import test from "node:test";

import { getToolDefinitions, Policy, Tool } from "../dist/index.js";

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

function registerDecoratedMethod(instance, methodName, options, policy, order) {
  const method = instance[methodName];
  const decorators = {
    policy: () => Policy(policy),
    tool: () =>
      Tool({
        name: options.name,
        description: options.description,
        schema: options.schema,
      }),
  };

  const initializers = order.flatMap((name) =>
    collectInitializers(decorators[name](), method, methodName),
  );

  for (const initializer of initializers) {
    initializer.call(instance);
  }
}

test("attaches an immutable policy snapshot regardless of decorator order", () => {
  const policy = {
    authorization: "required",
    approval: "required",
    retry: { maxAttempts: 3 },
  };

  class OrderedBeforeTool {
    execute() {
      return "before";
    }
  }

  class OrderedAfterTool {
    execute() {
      return "after";
    }
  }

  const before = new OrderedBeforeTool();
  registerDecoratedMethod(
    before,
    "execute",
    {
      name: "before_execute",
      description: "Execute before-order policy test.",
      schema: { type: "object" },
    },
    policy,
    ["policy", "tool"],
  );

  const after = new OrderedAfterTool();
  registerDecoratedMethod(
    after,
    "execute",
    {
      name: "after_execute",
      description: "Execute after-order policy test.",
      schema: { type: "object" },
    },
    policy,
    ["tool", "policy"],
  );

  policy.authorization = "application_default";
  policy.retry.maxAttempts = 1;

  for (const instance of [before, after]) {
    const [definition] = getToolDefinitions(instance);

    assert.deepEqual(definition?.policy, {
      authorization: "required",
      approval: "required",
      retry: { maxAttempts: 3 },
    });
    assert.equal(Object.isFrozen(definition?.policy), true);
    assert.equal(Object.isFrozen(definition?.policy?.retry), true);
  }
});

test("reuses policy metadata when a decorated class is instantiated twice", () => {
  class ReusableTool {
    execute() {
      return "reusable";
    }
  }

  const options = {
    name: "reusable_execute",
    description: "Execute a reusable policy-decorated tool.",
    schema: { type: "object" },
  };
  const policy = { authorization: "required" };

  const policyInitializers = collectInitializers(
    Policy(policy),
    ReusableTool.prototype.execute,
    "execute",
  );
  const toolInitializers = collectInitializers(
    Tool(options),
    ReusableTool.prototype.execute,
    "execute",
  );

  for (const instance of [new ReusableTool(), new ReusableTool()]) {
    for (const initializer of [...policyInitializers, ...toolInitializers]) {
      initializer.call(instance);
    }
  }

  const [definition] = getToolDefinitions(new ReusableTool());

  assert.deepEqual(definition?.policy, policy);
  assert.equal(definition?.invoke({}), "reusable");
});

test("retains policy metadata for an inherited decorated tool", () => {
  class Parent {
    execute() {
      return "parent";
    }
  }

  class Child extends Parent {}

  const instance = new Child();
  registerDecoratedMethod(
    instance,
    "execute",
    {
      name: "parent_execute",
      description: "Execute an inherited policy test.",
      schema: { type: "object" },
    },
    { audit: "required", timeoutMs: 1_000 },
    ["policy", "tool"],
  );

  const [definition] = getToolDefinitions(instance);

  assert.equal(definition?.name, "parent_execute");
  assert.deepEqual(definition?.policy, {
    audit: "required",
    timeoutMs: 1_000,
  });
  assert.equal(definition?.invoke({}), "parent");
});

test("rejects empty, malformed, and unsupported policy declarations", () => {
  const method = () => undefined;
  const context = {
    kind: "method",
    name: "execute",
    static: false,
    private: false,
    addInitializer() {},
  };

  for (const policy of [
    {},
    { authorization: "application_default" },
    { timeoutMs: 0 },
    { retry: { maxAttempts: 1.5 } },
    { retry: { maxAttempts: 2, unknown: true } },
    { unknown: "required" },
  ]) {
    assert.throws(
      () => Policy(policy)(method, context),
      /policy|required|positive|integer|unsupported/i,
    );
  }

  assert.throws(
    () =>
      Policy({ authorization: "required" })(method, {
        ...context,
        static: true,
      }),
    /public instance method/i,
  );
});
