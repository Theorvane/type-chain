import { Agent } from "../src/agent.js";
import { getToolDefinitions, Policy, Tool } from "../src/index.js";

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

    @Tool({
      name: "actual_policy_search",
      description: "Search using actual decorators with policy metadata.",
      schema,
    })
    @Policy({ authorization: "required", retry: { maxAttempts: 2 } })
    policySearch(input: { readonly query: string }): string {
      return `${this.prefix}policy:${input.query}`;
    }
  }

  const instance = new ActualDecoratorFixture();

  return {
    definitions: getToolDefinitions(instance),
    instance,
    schema,
  };
}
