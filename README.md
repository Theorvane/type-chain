# TypeChain

> A decorator-first, type-safe authoring layer for LangChain JS tools and agents.

> **Status:** private pre-implementation. TypeChain is not a usable LangChain integration and no npm package has been released.

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

`dev` is the protected default integration branch. `main` is release-only and accepts promotion PRs from `dev` only. Contributions use an issue → feature branch → PR → current-HEAD review + CI flow.

Agent instructions are authoritative only in [`.agents/`](.agents/); this repository intentionally has no `.github/agents/` directory.

## Development baseline

```bash
npm ci
npm run verify
npm run verify:publish
```

The current source and test files are build-pipeline sentinels, not product implementation. See [architecture](docs/architecture.md), [release guide](docs/release.md), and [contributing guide](CONTRIBUTING.md).

## Community

[Code of Conduct](CODE_OF_CONDUCT.md) · [Security](SECURITY.md) · [Support](SUPPORT.md) · [Governance](GOVERNANCE.md) · [MIT License](LICENSE)
