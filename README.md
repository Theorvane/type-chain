# TypeChain

> A decorator-first, type-safe authoring layer for LangChain JS tools and agents.

> **Status:** private, manual-governance pre-implementation. TypeChain is not a usable LangChain integration and no npm package has been released. GitHub Free cannot enforce branch rulesets for this private repository; maintainers must apply the documented manual merge gates until the project is mature enough to become public.

TypeChain will make LangChain JS agent and tool definitions easier to author without hiding their runtime contracts. It will use explicit runtime schemas, observable adapters, and policy-aware tools—not magic type inference.

```ts
// Target API only — not implemented or published yet.
class ResearchAgent {
  // @Tool({ name: "search_issues", schema: SearchIssuesInput })
  async searchIssues(input: unknown) { return input; }
}
```

## Design principles

- **Schemas are explicit.** Tool inputs use explicit Zod or JSON Schema runtime contracts.
- **LangChain remains visible.** Decorators adapt to standard LangChain tools, agents, and runtime context.
- **Policies run at runtime.** Approval, authorization, retry, timeout, and audit metadata must be enforced by guards or middleware.
- **Standard decorators first.** New code targets modern TypeScript decorators and avoids mandatory legacy reflection metadata.
- **Safe by default.** Side-effecting tools need an explicit approval and audit design.

## Planned package

- npm: `type-chain`
- Repository: `https://github.com/Theorvane/type-chain`
- Intended npm visibility: public after release readiness
- Current state: the npm name is currently available, but ownership and publication authorization are not established.

## Workflow

`dev` is the default integration branch. `main` is release-only and accepts promotion PRs from `dev` only. Until the repository becomes public, maintainers manually enforce the issue → feature branch → PR → current-HEAD review + CI flow and must not direct-push either lane.

Agent instructions are authoritative only in [`.agents/`](.agents/); this repository intentionally has no `.github/agents/` directory.

## Development baseline

```bash
npm ci
npm run verify
npm run verify:publish
```

The development branch currently exposes only a metadata registry; it is not yet a LangChain adapter. For example:

```ts
import { getToolDefinitions, Tool } from "type-chain";

class IssueTools {
  @Tool({
    name: "search_issues",
    description: "Search repository issues.",
    schema: { type: "object" },
  })
  async searchIssues(input: unknown) {
    return input;
  }
}

const definitions = getToolDefinitions(new IssueTools());
```

`schema` must be an explicit non-null runtime object (such as a future supported Zod or JSON Schema value); TypeChain does not parse it yet. See [architecture](docs/architecture.md), [release guide](docs/release.md), and [contributing guide](CONTRIBUTING.md).

## In-process TypeMCP composition

When an external API needs a reusable MCP-shaped tool contract but the LangChain agent runs in the same Node.js process, import the optional `type-chain/typemcp` subpath. It delegates tool conversion to TypeMCP's `createLangChainTools()` and passes the resulting standard LangChain tools to `createAgent()`; it does **not** start an HTTP or stdio MCP transport.

Install the optional peer dependencies in the application that imports this subpath:

```bash
npm install type-chain @theorvane/type-mcp @langchain/core langchain zod
```

```ts
import { McpServer, McpTool } from "@theorvane/type-mcp";
import { createTypeMcpAgent } from "type-chain/typemcp";
import { initChatModel } from "langchain";
import { z } from "zod";

interface CatalogClient {
  findProduct(sku: string): Promise<unknown>;
}

declare const catalogClient: CatalogClient;
const model = await initChatModel("openai:gpt-4.1-mini");

@McpServer({ name: "catalog_api", version: "1.0.0" })
class CatalogApiTools {
  private readonly client: CatalogClient;

  constructor(client: unknown) {
    if (!isCatalogClient(client)) throw new TypeError("Catalog client is required.");
    this.client = client;
  }

  @McpTool({
    name: "find_product",
    description: "Find a product through the catalog API.",
    input: z.object({ sku: z.string().min(1) }),
  })
  async findProduct({ sku }: { readonly sku: string }) {
    return this.client.findProduct(sku);
  }
}

function isCatalogClient(value: unknown): value is CatalogClient {
  return (
    typeof value === "object" &&
    value !== null &&
    "findProduct" in value &&
    typeof value.findProduct === "function"
  );
}

const agent = await createTypeMcpAgent({
  model,
  server: CatalogApiTools,
  resolver: { resolve: () => new CatalogApiTools(catalogClient) },
});
```

`createTypeMcpLangChainTools()` is available when an application wants to combine TypeMCP-provided tools with other LangChain tools itself. The application owns API credentials, timeouts, retries, authorization, approval, audit logging, and error/redaction policy. Use TypeMCP's HTTP or stdio hosts separately when a tool server must serve a different process or an external MCP client.


## Community

[Code of Conduct](CODE_OF_CONDUCT.md) · [Security](SECURITY.md) · [Support](SUPPORT.md) · [Governance](GOVERNANCE.md) · [MIT License](LICENSE)
