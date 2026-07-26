# TypeChain

> A decorator-first, type-safe authoring layer for LangChain JS tools and agents.

> **Status:** private, manual-governance implementation. TypeChain is not published and does not yet enforce runtime policy. GitHub Free cannot enforce branch rulesets for this private repository; maintainers must apply the documented manual merge gates until the project is mature enough to become public.

TypeChain will make LangChain JS agent and tool definitions easier to author without hiding their runtime contracts. It will use explicit runtime schemas, observable adapters, and policy-aware tools—not magic type inference.

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

The development branch exposes a metadata registry, a LangChain Core tool adapter, and a thin agent builder over LangChain `createAgent()`. It does not enforce approval, authorization, timeout, retry, or audit policies. For example:

```ts
import { Agent, buildAgent, Tool } from "type-chain";
import { initChatModel } from "langchain";
import { z } from "zod";

@Agent({ systemPrompt: "Use the issue search tool when useful." })
class IssueTools {
  prefix = "issue:";

  @Tool({
    name: "search_issues",
    description: "Search repository issues.",
    schema: z.object({ query: z.string().min(1) }),
  })
  async searchIssues(input: { query: string }) {
    return `${this.prefix}${input.query}`;
  }
}

const model = await initChatModel("openai:gpt-4.1-mini");
const agent = buildAgent(new IssueTools(), { model });
const result = await agent.invoke({
  messages: [{ role: "user", content: "Find TypeChain issues." }],
});
```

`buildAgent()` delegates agent construction to LangChain's `createAgent()` and the tool adapter delegates schema parsing and validation to LangChain Core. TypeChain intentionally does not enforce approval, authorization, timeout, retry, or audit policies.

`schema` must be an explicit non-null runtime object accepted by the installed `@langchain/core` version (for example, a Zod or JSON Schema value). TypeChain passes it through unchanged; LangChain Core owns parsing and validation. See [architecture](docs/architecture.md), [release guide](docs/release.md), and [contributing guide](CONTRIBUTING.md).

## Community

[Code of Conduct](CODE_OF_CONDUCT.md) · [Security](SECURITY.md) · [Support](SUPPORT.md) · [Governance](GOVERNANCE.md) · [MIT License](LICENSE)
