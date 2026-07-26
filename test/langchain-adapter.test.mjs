import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
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
