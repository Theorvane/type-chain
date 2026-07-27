import assert from "node:assert/strict";
import test from "node:test";

import {
  getToolDefinitions,
  Policy,
  Tool,
  withToolPolicyGuard,
} from "../dist/index.js";

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

  const initializers = decorators.flatMap((decorator) =>
    collectInitializers(decorator, method, methodName),
  );

  for (const initializer of initializers) {
    initializer.call(instance);
  }
}

test("runs the application guard before a policy-decorated tool", async () => {
  class IssueTools {
    calls = [];

    update({ id }) {
      this.calls.push(id);
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
      schema: { type: "object" },
    },
    { authorization: "required", approval: "required" },
  );

  const calls = [];
  const [definition] = withToolPolicyGuard(instance, async (context) => {
    calls.push({
      input: context.input,
      name: context.definition.name,
      policy: context.policy,
    });
  });

  assert.equal(await definition?.invoke({ id: "42" }), "updated:42");
  assert.deepEqual(calls, [
    {
      input: { id: "42" },
      name: "update_issue",
      policy: { authorization: "required", approval: "required" },
    },
  ]);
  assert.deepEqual(instance.calls, ["42"]);
  assert.equal(Object.isFrozen(definition), true);
});

test("does not invoke the application guard for a tool without declared policy", async () => {
  class ReadTools {
    get({ id }) {
      return `issue:${id}`;
    }
  }

  const instance = new ReadTools();
  decorate(instance, "get", {
    name: "get_issue",
    description: "Get an issue.",
    schema: { type: "object" },
  });

  let guardCalls = 0;
  const original = getToolDefinitions(instance);
  const definitions = withToolPolicyGuard(instance, () => {
    guardCalls += 1;
  });

  assert.equal(await definitions[0]?.invoke({ id: "7" }), "issue:7");
  assert.equal(guardCalls, 0);
  assert.equal(definitions[0]?.policy, undefined);
  assert.equal(Object.isFrozen(definitions), true);
  assert.notEqual(definitions[0], original[0]);
});

test("rejects a non-function policy guard", () => {
  assert.throws(
    () => withToolPolicyGuard({}, null),
    /policy guard must be a function/i,
  );
});

test("preserves a tool error after the application guard allows invocation", async () => {
  const originalError = new Error("Application client failed.");

  class FailingTools {
    execute() {
      throw originalError;
    }
  }

  const instance = new FailingTools();
  decorate(
    instance,
    "execute",
    {
      name: "failing_execute",
      description: "Execute a failing guarded tool.",
      schema: { type: "object" },
    },
    { audit: "required" },
  );

  const [definition] = withToolPolicyGuard(instance, () => undefined);

  await assert.rejects(
    () => definition?.invoke({}),
    (error) => {
      assert.equal(error, originalError);
      return true;
    },
  );
});

test("propagates a rejected application guard without invoking the tool", async () => {
  class DangerousTools {
    calls = 0;

    delete() {
      this.calls += 1;
      return "deleted";
    }
  }

  const instance = new DangerousTools();
  decorate(
    instance,
    "delete",
    {
      name: "delete_issue",
      description: "Delete an issue.",
      schema: { type: "object" },
    },
    { approval: "required" },
  );

  const [definition] = withToolPolicyGuard(instance, () => {
    throw new Error("Approval is required.");
  });

  await assert.rejects(() => definition?.invoke({}), /approval is required/i);
  assert.equal(instance.calls, 0);
});
