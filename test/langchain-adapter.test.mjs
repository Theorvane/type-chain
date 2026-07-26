import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { z as z3 } from "zod-v3";
import { Tool, toLangChainTools } from "../dist/index.js";

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

test("rejects schemas that do not describe structured object input", () => {
  class PrimitiveTools {
    echo(input) {
      return input;
    }
  }

  const instance = new PrimitiveTools();
  applyMethodDecorator(instance, "echo", {
    name: "echo_value",
    description: "Echo a primitive value.",
    schema: z.string().min(2),
  });

  assert.throws(
    () => toLangChainTools(instance),
    /structured object input schema/i,
  );
});

test("accepts and validates structured Zod v3 input schemas", async () => {
  const schema = z3.object({ query: z3.string().min(1) });
  class SearchTools {
    search({ query }) {
      return `zod-v3:${query}`;
    }
  }

  const instance = new SearchTools();
  applyMethodDecorator(instance, "search", {
    name: "search_v3_issues",
    description: "Search issues with a Zod v3 schema.",
    schema,
  });

  const [searchIssues] = toLangChainTools(instance);

  assert.equal(searchIssues.schema, schema);
  assert.equal(await searchIssues.invoke({ query: "42" }), "zod-v3:42");
  await assert.rejects(() => searchIssues.invoke({ query: "" }));
});

test("adapts decorated methods into invocable LangChain structured tools", async () => {
  const schema = z.object({ query: z.string().min(1) });
  class SearchTools {
    prefix = "langchain:";

    async search({ query }) {
      return `${this.prefix}${query}`;
    }
  }

  const instance = new SearchTools();
  applyMethodDecorator(instance, "search", {
    name: "search_issues",
    description: "Search repository issues.",
    schema,
  });

  const [searchIssues] = toLangChainTools(instance);

  assert.equal(searchIssues.name, "search_issues");
  assert.equal(searchIssues.description, "Search repository issues.");
  assert.equal(searchIssues.schema, schema);
  assert.equal(await searchIssues.invoke({ query: "42" }), "langchain:42");
  await assert.rejects(() => searchIssues.invoke({ query: "" }));
});
