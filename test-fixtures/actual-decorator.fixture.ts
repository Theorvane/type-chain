import { Agent } from "../src/agent.js";
import { getToolDefinitions, Tool } from "../src/index.js";

export function createDecoratedFixture() {
  const schema = { type: "object" };

  @Agent({ systemPrompt: "Use decorated fixture tools." })
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

  const instance = new ActualDecoratorFixture();

  return {
    definitions: getToolDefinitions(instance),
    instance,
    schema,
  };
}
