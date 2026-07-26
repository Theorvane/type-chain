import assert from "node:assert/strict";
import test from "node:test";

import { getToolDefinitions, Tool } from "../dist/index.js";

function collectInitializers(method, methodName, options) {
  const initializers = [];
  Tool(options)(method, {
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

test("rejects inherited duplicate names during decorator initialization", () => {
  class Parent {
    execute() {}
  }

  class Child extends Parent {
    execute() {}
  }

  const parentInitializers = collectInitializers(
    Parent.prototype.execute,
    "execute",
    {
      name: "same_name",
      description: "Execute the parent behavior.",
      schema: {},
    },
  );
  const childInitializers = collectInitializers(
    Child.prototype.execute,
    "execute",
    {
      name: "same_name",
      description: "Execute the child behavior.",
      schema: {},
    },
  );
  const instance = new Child();

  for (const initializer of parentInitializers) {
    initializer.call(instance);
  }
  assert.throws(() => {
    for (const initializer of childInitializers) {
      initializer.call(instance);
    }
  }, /duplicate tool name/i);
});

test("retains decorated base and overridden methods as distinct inherited definitions", () => {
  class Parent {
    execute() {
      return "parent";
    }
  }

  class Child extends Parent {
    execute() {
      return "child";
    }
  }

  const parentInitializers = collectInitializers(
    Parent.prototype.execute,
    "execute",
    {
      name: "parent_execute",
      description: "Execute the parent behavior.",
      schema: {},
    },
  );
  const childInitializers = collectInitializers(
    Child.prototype.execute,
    "execute",
    {
      name: "child_execute",
      description: "Execute the child behavior.",
      schema: {},
    },
  );
  const instance = new Child();

  for (const initializer of [...parentInitializers, ...childInitializers]) {
    initializer.call(instance);
  }

  const definitions = getToolDefinitions(instance);

  assert.deepEqual(
    definitions.map((definition) => definition.name),
    ["parent_execute", "child_execute"],
  );
  assert.equal(definitions[0].invoke({}), "parent");
  assert.equal(definitions[1].invoke({}), "child");
});
