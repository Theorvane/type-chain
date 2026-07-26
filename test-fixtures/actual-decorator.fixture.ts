import { getToolDefinitions, Tool } from "../src/index.js";

export function createDecoratedFixture() {
  const schema = { type: "object" };

  class ActualDecoratorFixture {
    prefix = "actual:";

    @Tool({
      name: "actual_search",
      description: "Search using an actual TypeScript decorator.",
      schema,
    })
    search(input: { readonly query: string }): string {
      return `${this.prefix}${input.query}`;
    }
  }

  return {
    definitions: getToolDefinitions(new ActualDecoratorFixture()),
    schema,
  };
}
