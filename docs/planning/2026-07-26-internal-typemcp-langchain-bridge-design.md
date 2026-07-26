# Internal TypeMCP + LangChain Bridge Design

**Status:** Approved for implementation through GitHub issue #11.

## Goal

Allow a consumer to wrap an external API in a TypeMCP-decorated class and compose its tools into a LangChain agent in the **same Node.js process**, without starting an MCP HTTP or stdio transport.

## Problem

External APIs need explicit input schemas, dependency injection, authentication, timeout, retry, error normalization, and auditable ownership. TypeMCP already provides decorator metadata, explicit instance resolution, and a published tools-only LangChain adapter. TypeChain should make the final LangChain agent composition convenient without copying either framework.

## Chosen architecture

```text
External API client (consumer-owned)
  └─ TypeMCP @McpServer + @McpTool class
       └─ TypeMCP createLangChainTools(server, { resolver })
            └─ TypeChain optional in-process bridge
                 └─ LangChain createAgent({ model, tools, ...options })
```

The bridge is an optional `type-chain/typemcp` subpath. Its only responsibilities are:

1. Forward a TypeMCP server constructor and explicit resolver to TypeMCP's published `createLangChainTools()` adapter.
2. Return the generated LangChain tools unchanged.
3. Construct a LangChain agent by calling LangChain's `createAgent()` with those tools and caller-supplied model/options.

## Public API

```ts
import {
  createTypeMcpLangChainTools,
  createTypeMcpAgent,
} from "type-chain/typemcp";

const tools = await createTypeMcpLangChainTools(GitHubApiServer, {
  resolver: { resolve: () => new GitHubApiServer(client) },
});

const agent = await createTypeMcpAgent({
  model,
  server: GitHubApiServer,
  resolver: { resolve: () => new GitHubApiServer(client) },
});
```

`createTypeMcpAgent()` accepts the TypeMCP server constructor, resolver, model, and LangChain agent options. It must not select a model, read secrets, construct a client, or add hidden middleware.

## Consumer example: external API wrapper

```ts
import { McpServer, McpTool } from "@theorvane/type-mcp";
import { createTypeMcpAgent } from "type-chain/typemcp";
import { z } from "zod";

@McpServer({ name: "github_api", version: "1.0.0" })
class GitHubApiServer {
  constructor(private readonly github: GitHubClient) {}

  @McpTool({
    description: "Search issues in a repository.",
    input: z.object({
      repository: z.string().min(1),
      query: z.string().min(1),
    }),
  })
  async searchIssues(input: { repository: string; query: string }) {
    return this.github.searchIssues(input);
  }
}

const agent = await createTypeMcpAgent({
  model,
  server: GitHubApiServer,
  resolver: { resolve: () => new GitHubApiServer(githubClient) },
});
```

The `GitHubClient` is consumer-owned. It is the correct owner for credentials, allowed hosts, request timeouts, retry/backoff, rate-limit behavior, result normalization, authorization, and audit logging.

## Dependency boundary

The root TypeChain entrypoint must remain usable without TypeMCP. The `type-chain/typemcp` entrypoint declares optional peer dependencies on:

- `@theorvane/type-mcp`
- `@langchain/core`
- `langchain`

A consumer importing the bridge installs compatible peers explicitly. TypeChain must not bundle a copy of TypeMCP, LangChain, a model provider, or an MCP SDK transport.

## Explicit non-goals

- MCP HTTP/Streamable HTTP or stdio server startup.
- MCP clients, sessions, protocol routing, or discovery.
- Direct external HTTP API access from TypeChain.
- Automatic model selection, credentials, authorization, approval, retries, timeout, audit logging, state persistence, or LangGraph topology.
- Reimplementation of TypeMCP's decorators, resolver, validation, or LangChain tool adapter.

## Error behavior

The bridge should preserve errors from TypeMCP resolution/tool conversion and LangChain agent construction. It adds no catch-and-rewrite layer: consumer hosts must be able to diagnose configuration errors without losing their originating library context.

## Verification requirements

1. Unit/integration test verifies the tool helper forwards the server and resolver to TypeMCP's published adapter.
2. A real decorated TypeMCP server with an injected external-API-like client is converted to a tool and validates schema input.
3. An in-memory LangChain fake tool-calling model invokes the TypeMCP-backed tool through the created agent and receives its result.
4. Root entrypoint compatibility remains verified without importing the optional bridge.
5. Package export and consumer smoke verification confirm the bridge's optional peer and subpath-export contract.

## Future documentation reuse

This document is the canonical design source for future TypeChain documentation covering internal TypeMCP composition. Public guides should derive their architecture diagram, external API wrapper example, dependency install instructions, explicit ownership boundaries, and non-goals from this file.
