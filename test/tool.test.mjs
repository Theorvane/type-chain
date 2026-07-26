import assert from "node:assert/strict";
import test from "node:test";

import { getToolDefinitions, Tool } from "../dist/index.js";

function applyMethodDecorator(instance, methodName, options) {
  const initializers = [];
  const original = instance[methodName];
  const replacement = Tool(options)(original, {
    kind: "method",
    name: methodName,
    static: false,
    private: false,
    addInitializer(initializer) {
      initializers.push(initializer);
    },
  });

  if (replacement !== undefined) {
    instance[methodName] = replacement;
  }

  for (const initializer of initializers) {
    initializer.call(instance);
  }
}

test("collects a definition with the original schema and a receiver-bound method", async () => {
  const schema = { type: "object" };
  class Searcher {
    prefix = "issue:";

    async search({ query }) {
      return `${this.prefix}${query}`;
    }
  }
  const instance = new Searcher();

  applyMethodDecorator(instance, "search", {
    name: "search_issues",
    description: "Search repository issues.",
    schema,
  });

  const definitions = getToolDefinitions(instance);

  assert.equal(definitions.length, 1);
  assert.equal(definitions[0].name, "search_issues");
  assert.equal(definitions[0].description, "Search repository issues.");
  assert.equal(definitions[0].schema, schema);
  assert.equal(await definitions[0].invoke({ query: "123" }), "issue:123");
  assert.equal(Object.isFrozen(definitions), true);
  assert.equal(Object.isFrozen(definitions[0]), true);
});

test("rejects missing schemas and non-portable tool names at declaration time", () => {
  const method = () => undefined;
  const context = {
    kind: "method",
    name: "lookup",
    static: false,
    private: false,
    addInitializer() {},
  };

  assert.throws(
    () => Tool({ name: "lookup", description: "Lookup." })(method, context),
    /schema/i,
  );
  assert.throws(
    () =>
      Tool({ name: "Lookup Issues", description: "Lookup.", schema: {} })(
        method,
        context,
      ),
    /snake_case/i,
  );
});

test("snapshots validated options before instance initialization", () => {
  class Searcher {
    search() {}
  }
  const options = {
    name: "search_issues",
    description: "Search repository issues.",
    schema: { type: "object" },
  };
  const initializers = [];
  const decorator = Tool(options);

  decorator(Searcher.prototype.search, {
    kind: "method",
    name: "search",
    static: false,
    private: false,
    addInitializer(initializer) {
      initializers.push(initializer);
    },
  });
  options.name = "Not portable";
  options.description = "   ";
  options.schema = null;

  const instance = new Searcher();
  for (const initializer of initializers) {
    initializer.call(instance);
  }

  const [definition] = getToolDefinitions(instance);
  assert.equal(definition?.name, "search_issues");
  assert.equal(definition?.description, "Search repository issues.");
  assert.deepEqual(definition?.schema, { type: "object" });
});

test("rejects static, private, and non-method declarations", () => {
  const method = () => undefined;
  const options = { name: "lookup", description: "Lookup.", schema: {} };

  for (const context of [
    {
      kind: "method",
      name: "lookup",
      static: true,
      private: false,
      addInitializer() {},
    },
    {
      kind: "method",
      name: "lookup",
      static: false,
      private: true,
      addInitializer() {},
    },
    {
      kind: "field",
      name: "lookup",
      static: false,
      private: false,
      addInitializer() {},
    },
  ]) {
    assert.throws(
      () => Tool(options)(method, context),
      /public instance method/i,
    );
  }
});

test("rejects duplicate names registered for one instance", () => {
  class Duplicate {
    first() {}
    second() {}
  }
  const instance = new Duplicate();
  const options = {
    name: "same_name",
    description: "A named tool.",
    schema: {},
  };

  applyMethodDecorator(instance, "first", options);

  assert.throws(
    () => applyMethodDecorator(instance, "second", options),
    /duplicate tool name/i,
  );
});
