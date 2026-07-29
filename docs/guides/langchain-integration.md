# LangChain integration

`@theorvane/type-chain@0.1.1` exposes a dedicated `/langchain` subpath that turns decorated methods into standard LangChain structured tools. LangChain owns schema parsing and validation; TypeChain preserves the explicit name, description, schema, and receiver-bound invocation.

## Prerequisites

- Node.js 20 or later
- TypeScript with standard (Stage 3) decorators; do **not** enable `experimentalDecorators`
- An application-owned model and agent lifecycle if you later compose these tools into an agent

## Install

```bash
npm install @theorvane/type-chain@0.1.1 @langchain/core langchain zod
```

The root package remains independent of optional peers. Import `/langchain` only where the application needs this adapter.

## Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022", "ESNext.Decorators"],
    "strict": true,
    "verbatimModuleSyntax": true
  }
}
```

Leave `experimentalDecorators` off.

## Adapt a decorated tool

Create `src/search-tools.ts`:

```ts
import { z } from "zod";
import { Tool } from "@theorvane/type-chain";

export class SearchTools {
  @Tool({
    name: "search_catalog",
    description: "Search the product catalog.",
    schema: z.object({ query: z.string().min(1) }),
  })
  searchCatalog({ query }: { query: string }) {
    return [{ id: "p_1", title: `Result for ${query}` }];
  }
}
```

Create `src/langchain-tools.ts`:

```ts
import { toLangChainTools } from "@theorvane/type-chain/langchain";
import { SearchTools } from "./search-tools.js";

export const tools = toLangChainTools(new SearchTools());
```

`toLangChainTools()` accepts structured object schemas supported by LangChain's `tool()` factory. For JSON Schema, the root schema must be `type: "object"`.

## Expected behavior

`tools` contains a standard LangChain structured tool named `search_catalog`. LangChain validates structured input before receiver-bound invocation; a model, agent, graph, endpoint, and state are not created.

## Responsibility boundary

TypeChain supplies adapter-generated tools. Your application owns model selection, provider credentials, agent and graph topology, state, streaming, policy enforcement, persistence, hosting, and deployment.

## Next steps

- [Policy and guards](./policy.md) — use `toGuardedLangChainTools()` with an application-owned guard.
- [Agent builder](./agent-builder.md) — build a small agent from an application-supplied model.
- [TypeMCP bridge](./typemcp-bridge.md) — adapt a TypeMCP server only when both sides run in one process.
