# TypeMCP in-process bridge

The published `@theorvane/type-chain@0.2.0` `/typemcp` subpath composes a TypeMCP-decorated server into native LangChain tools in the same Node.js process. TypeMCP owns declaration validation and instance resolution; LangChain owns agent construction; the application owns models, policies, dependencies, and deployment.

## Prerequisites

- Node.js 20 or later
- TypeScript with standard (Stage 3) decorators; do **not** enable `experimentalDecorators`
- A TypeMCP-decorated server class and its application-owned resolver dependencies
- Both the TypeMCP server and LangChain consumer running in the same Node.js process

## Install

```bash
npm install @theorvane/type-chain@0.2.0 @theorvane/type-mcp@0.3.0 @langchain/core langchain zod
```

This is an optional integration boundary; the root TypeChain package does not import TypeMCP or LangChain peers.

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

## Convert a TypeMCP server to LangChain tools

Create `src/catalog-server.ts` as a zero-argument TypeMCP-decorated server with an application-owned configuration seam. Then create `src/typemcp-tools.ts`:

```ts
import { createTypeMcpLangChainTools } from "@theorvane/type-chain/typemcp";
import type { CatalogClient } from "./catalog-server.js";
import { CatalogServer } from "./catalog-server.js";

// This client is constructed and authorized by application code.
declare const catalogClient: CatalogClient;

export const tools = await createTypeMcpLangChainTools(CatalogServer, {
  resolver: { resolve: () => new CatalogServer().configure(catalogClient) },
});
```

The released TypeMCP `@McpServer` contract requires a zero-argument decorated constructor. The explicit resolver configures the application-owned dependency before TypeChain delegates to TypeMCP's `createLangChainTools()`.

## Expected behavior

`tools` contains native LangChain tools for the decorated `CatalogServer` methods. Resolving and invoking a tool uses the supplied `catalogClient`; no stdio/HTTP listener, MCP client/session, or cross-process connection is created.

## Transport boundary

The in-process bridge does **not** open MCP HTTP or stdio transports, implement MCP clients or sessions, supply credentials, or enforce authorization, approval, retries, timeouts, auditing, or redaction. Use TypeMCP transport hosts separately when cross-process MCP access is required.

## Next steps

- [LangChain integration](./langchain-integration.md) — understand the standard structured-tool boundary.
- [Agent builder](./agent-builder.md) — create a caller-owned agent with a caller-owned model.
- [Petstore walkthrough](./petstore-walkthrough.md) — see the same-process bridge in one named catalog scenario.
