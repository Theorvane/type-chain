import { getToolDefinitions, Tool } from "../src/index.js";

const issueSearchSchema = { type: "object" };

class IssueTools {
  prefix = "issue:";

  @Tool({
    name: "search_issues",
    description: "Search repository issues.",
    schema: issueSearchSchema,
  })
  async search(input: { readonly query: string }): Promise<string> {
    return `${this.prefix}${input.query}`;
  }
}

const definitions = getToolDefinitions(new IssueTools());
const firstDefinition = definitions[0];

if (firstDefinition !== undefined) {
  firstDefinition.invoke({ query: "123" });
}
