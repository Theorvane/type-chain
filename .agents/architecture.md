# Agent Architecture Constraints

TypeChain is an adapter library for authoring LangChain JS tools and agents with modern TypeScript decorators; it does not replace LangChain or LangGraph.

1. Decorators record metadata; they do not authorize or execute.
2. Every public tool requires an explicit runtime schema and portable explicit name.
3. Bind decorated methods to a real instance; do not break dependency injection.
4. Preserve LangChain runtime context and provider-visible schema semantics.
5. Policy decorators compile to explicit policy data and runtime guards/middleware enforce it.
6. State-changing tools define authorization, approval, idempotency, retry limits, errors, and audit/redaction before exposure.
7. Exported features require supported-version LangChain integration coverage.
