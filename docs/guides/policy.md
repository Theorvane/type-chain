# Declarative policy and application-owned guards

The published `@theorvane/type-chain@0.1.1` package lets a tool declare policy intent. It does not supply a default allow/deny decision or enforce authorization, approvals, retries, timeouts, idempotency, auditing, or redaction.

## Declare intent with @Policy()

Apply `@Policy()` to the same public instance method as `@Tool()`.

```ts
import { z } from "zod";
import { Policy, Tool } from "@theorvane/type-chain";

class BillingTools {
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

The supported intent fields are:

| Field | Accepted value |
| --- | --- |
| `authorization` | `"required"` |
| `approval` | `"required"` |
| `audit` | `"required"` |
| `idempotency` | `"required"` |
| `timeoutMs` | positive safe integer |
| `retry` | `{ maxAttempts: positive safe integer }` |

The policy object must contain at least one supported field. TypeChain freezes the recorded snapshot so later mutation cannot silently change a declared tool policy.

## Enforce it in your application

Use `withToolPolicyGuard(instance, guard)` to return immutable definitions that invoke your guard before a policy-decorated tool runs.

```ts
import { withToolPolicyGuard } from "@theorvane/type-chain";

const billing = new BillingTools();
const guarded = withToolPolicyGuard(billing, async ({ definition, policy, input }) => {
  await authorizeCurrentUser({ action: definition.name, input });
  await requireApprovalIfNeeded(policy, input);
  await appendAuditRecord({ tool: definition.name, policy, input });
});

await guarded[0]?.invoke({ invoiceId: "inv_123", amount: 25 });
```

Throw or reject from the guard to prevent invocation. Tools with no declared `@Policy()` preserve direct invocation behavior. TypeChain does not interpret a policy field or add fallback behavior when the application has not supplied a guard.

## Use guarded LangChain tools

For LangChain, import the dedicated adapter and pass the same kind of guard:

```ts
import { toGuardedLangChainTools } from "@theorvane/type-chain/langchain";

const tools = toGuardedLangChainTools(billing, async (context) => {
  await authorizeCurrentUser({ action: context.definition.name, input: context.input });
});
```

LangChain Core validates structured inputs before invoking the decorated tool. The application-supplied guard runs before the receiver-bound method executes.

## Boundary

A declared `@Policy()` is metadata, not security. Your application owns identities, authorization, approval UX, rate limits, retries, timeouts, idempotency keys, audit destinations, redaction, error handling, and deployment controls. Treat the guard as one integration point inside those application-owned controls, not as a replacement for them.
