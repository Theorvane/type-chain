import { Agent, getToolDefinitions, Policy, Tool } from "../src/legacy.js";

const schema = { type: "object" };

@Agent({ systemPrompt: "Use legacy tools." })
class LegacyTools {
  prefix = "legacy:";

  @Tool({
    name: "search_issues",
    description: "Search repository issues.",
    schema,
  })
  @Policy({ authorization: "required" })
  search(input: { readonly query: string }): string {
    return `${this.prefix}${input.query}`;
  }
}

const definitions = getToolDefinitions(new LegacyTools());
const definition = definitions[0];

if (
  definition === undefined ||
  definition.invoke({ query: "123" }) !== "legacy:123"
) {
  throw new Error(
    "Legacy decorators did not register a receiver-bound tool definition.",
  );
}
