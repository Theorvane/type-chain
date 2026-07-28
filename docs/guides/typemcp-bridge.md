# TypeMCP in-process bridge

The published `@theorvane/type-chain@0.1.1` `@theorvane/type-chain/typemcp` subpath composes a TypeMCP-decorated server into native LangChain tools in the same Node.js process. TypeMCP owns declaration validation and instance resolution; LangChain owns agent construction; the application owns models, policies, and deployment.

## Install peers

```bash
npm install @theorvane/type-chain @theorvane/type-mcp @langchain/core langchain zod
```

This is an optional integration boundary. The root `@theorvane/type-chain` metadata package does not import TypeMCP or LangChain peers.

## Convert a TypeMCP server to LangChain tools

```ts
import { createTypeMcpLangChainTools } from "@theorvane/type-chain/typemcp";

const tools = await createTypeMcpLangChainTools(CatalogServer, {
  resolver: {
    resolve: () => new CatalogServer(catalogClient),
  },
});
```

The bridge delegates to TypeMCP's `createLangChainTools()`. Your resolver remains explicit and application-owned.

## Build an agent without starting a transport

```ts
import { createTypeMcpAgent } from "@theorvane/type-chain/typemcp";

const agent = await createTypeMcpAgent({
  model: yourApplicationModel,
  server: CatalogServer,
  resolver: {
    resolve: () => new CatalogServer(catalogClient),
  },
});
```

`createTypeMcpAgent()` uses the generated LangChain tools with LangChain's `createAgent()`. It does not open a stdio or HTTP transport.

## Guard TypeMCP-derived tool calls

Use the guarded variants to run an application-owned hook after TypeMCP/LangChain input validation and before the resolver-backed method runs:

```ts
import { createGuardedTypeMcpAgent } from "@theorvane/type-chain/typemcp";

const agent = await createGuardedTypeMcpAgent({
  model: yourApplicationModel,
  server: CatalogServer,
  resolver: { resolve: () => new CatalogServer(catalogClient) },
  guard: async ({ name, description, input }) => {
    await authorizeToolCall({ name, description, input });
  },
});
```

The guard receives an immutable snapshot containing a tool name, description, and validated input. Throw or reject to stop the resolver-backed invocation. TypeChain does not provide a default allow/deny decision.

## Transport boundary

The in-process bridge deliberately does **not** open MCP HTTP or stdio transports, implement MCP clients or sessions, supply credentials, or enforce authorization, approval, retries, timeouts, auditing, or redaction. Use TypeMCP transport hosts separately when cross-process MCP access is required.
