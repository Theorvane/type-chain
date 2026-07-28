# LangChain integration

`@theorvane/type-chain@0.1.1` exposes a dedicated `@theorvane/type-chain/langchain` subpath that turns decorated methods into standard LangChain structured tools. LangChain owns schema parsing and validation; TypeChain preserves your explicit name, description, schema, and receiver-bound invocation.

## Install peers

Install TypeChain alongside the LangChain packages your application uses:

```bash
npm install @theorvane/type-chain @langchain/core langchain zod
```

The root metadata import remains independent of these optional peers. Import the `/langchain` subpath only where the application needs this adapter.

## Adapt decorated tools

```ts
import { z } from "zod";
import { Tool } from "@theorvane/type-chain";
import { toLangChainTools } from "@theorvane/type-chain/langchain";

class SearchTools {
  @Tool({
    name: "search_catalog",
    description: "Search the product catalog.",
    schema: z.object({ query: z.string().min(1) }),
  })
  searchCatalog({ query }: { query: string }) {
    return [{ id: "p_1", title: `Result for ${query}` }];
  }
}

const tools = toLangChainTools(new SearchTools());
```

`toLangChainTools()` accepts structured object schemas supported by LangChain's `tool()` factory. For Zod schemas, refinements and transforms are accepted when the input schema remains a structured object. For JSON Schema, the root schema must declare `type: "object"`.

## Compose an application-owned agent

Use the resulting tools with the LangChain model, agent lifecycle, state, memory, persistence, and deployment controls that your application owns.

```ts
import { createAgent } from "langchain";

const agent = createAgent({
  model: yourApplicationModel,
  tools,
  systemPrompt: "Use catalog tools only when a product lookup is needed.",
});
```

TypeChain does not select a model, configure provider credentials, create a LangGraph topology, hold state, persist conversations, or host an endpoint.

## Guard policy-decorated tools

When a tool declares `@Policy()`, compose the application-owned guard before adaptation:

```ts
import { toGuardedLangChainTools } from "@theorvane/type-chain/langchain";

const guardedTools = toGuardedLangChainTools(new SearchTools(), async ({ definition, policy, input }) => {
  await enforceApplicationPolicy({ tool: definition.name, policy, input });
});
```

The guard may throw or reject to stop a policy-decorated invocation. No default policy decision exists in TypeChain.

## Related guides

- [Tools and definitions](./tools-and-definitions.md)
- [Declarative policy and application-owned guards](./policy.md)
- [Agent builder](./agent-builder.md)
- [TypeMCP in-process bridge](./typemcp-bridge.md)
