# Declarative policy and application-owned guards

The published `@theorvane/type-chain@0.2.0` package lets a tool declare policy intent. It does not provide a default allow/deny decision or enforce authorization, approvals, retries, timeouts, idempotency, auditing, or redaction.

## Prerequisites

- Node.js 20 or later
- TypeScript with standard (Stage 3) decorators; do **not** enable `experimentalDecorators`
- A concrete application policy function that can reject before a domain method runs

## Install

```bash
npm install @theorvane/type-chain@0.2.0 zod
```

Use the `/langchain` optional subpath only if the application later adapts guarded tools to LangChain.

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

## Declare policy intent

Create `src/billing-tools.ts`:

```ts
import { z } from "zod";
import { Policy, Tool } from "@theorvane/type-chain";

export class BillingTools {
  @Policy({ authorization: "required", approval: "required", audit: "required" })
  @Tool({
    name: "issue_refund",
    description: "Issue a refund for an invoice.",
    schema: z.object({ invoiceId: z.string(), amount: z.number().positive() }),
  })
  issueRefund(input: { invoiceId: string; amount: number }) {
    return { refundId: `refund_${input.invoiceId}`, amount: input.amount };
  }
}
```

The supported fields are `authorization`, `approval`, `audit`, `idempotency`, `timeoutMs`, and `retry`. A policy object needs at least one supported field; TypeChain freezes the recorded snapshot.

## Enforce it in application code

Create `src/guarded-billing-tools.ts`:

```ts
import { withToolPolicyGuard } from "@theorvane/type-chain";
import { BillingTools } from "./billing-tools.js";

const billing = new BillingTools();
export const guarded = withToolPolicyGuard(billing, async ({ definition, policy, input }) => {
  await authorizeCurrentUser({ action: definition.name, input });
  await requireApprovalIfNeeded(policy, input);
  await appendAuditRecord({ tool: definition.name, policy, input });
});
```

Throw or reject from the application guard to prevent invocation. Tools without declared `@Policy()` keep direct invocation behavior.

## Expected behavior

`guarded` exposes an immutable definition for `issue_refund`; invoking it calls the application guard before `BillingTools.issueRefund`. A rejected guard prevents the method body from running.

## Responsibility boundary

`@Policy()` is metadata, not security. Your application owns identities, authorization, approval UX, rate limits, retries, timeouts, idempotency keys, audit destinations, redaction, errors, persistence, hosting, and deployment.

## Next steps

- [LangChain integration](./langchain-integration.md) — use `toGuardedLangChainTools()` at the adapter boundary.
- [Agent builder](./agent-builder.md) — supply a guard while building a narrow LangChain agent.
- [Petstore walkthrough](./petstore-walkthrough.md) — apply the pattern to a state-changing catalog tool.
