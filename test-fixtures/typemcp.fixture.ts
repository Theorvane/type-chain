import { McpServer, McpTool } from "@theorvane/type-mcp";
import { z } from "zod";

interface ExternalApiClient {
  searchIssues(input: { readonly query: string }): Promise<string>;
}

export class FakeExternalApiClient implements ExternalApiClient {
  async searchIssues(input: { readonly query: string }): Promise<string> {
    return `external-api:${input.query}`;
  }
}

@McpServer({ name: "external_api", version: "1.0.0" })
export class ExternalApiServer {
  private readonly client: ExternalApiClient;

  constructor(client: unknown) {
    if (!isExternalApiClient(client)) {
      throw new TypeError("ExternalApiServer requires an external API client.");
    }
    this.client = client;
  }

  @McpTool({
    name: "search_issues",
    description: "Search issues through an external API.",
    input: z.object({ query: z.string().min(1) }),
  })
  async searchIssues(input: { readonly query: string }): Promise<string> {
    return this.client.searchIssues(input);
  }
}

@McpServer({ name: "rich_input", version: "1.0.0" })
export class RichInputServer {
  observed: unknown;

  @McpTool({
    name: "inspect_rich_input",
    description: "Inspect rich structured input without mutating it.",
    input: z.object({
      at: z.date(),
      labels: z.map(z.string(), z.number()),
      values: z.set(z.string()),
      bytes: z.instanceof(Uint8Array),
    }),
  })
  inspect(input: unknown): string {
    this.observed = input;
    return "inspected";
  }
}

function isExternalApiClient(value: unknown): value is ExternalApiClient {
  return (
    typeof value === "object" &&
    value !== null &&
    "searchIssues" in value &&
    typeof value.searchIssues === "function"
  );
}
