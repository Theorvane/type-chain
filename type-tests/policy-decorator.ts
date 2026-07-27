import { Policy, Tool, type ToolPolicy } from "../src/index.js";

const policy = {
  authorization: "required",
  approval: "required",
  audit: "required",
  idempotency: "required",
  timeoutMs: 5_000,
  retry: { maxAttempts: 3 },
} satisfies ToolPolicy;

class PolicyTypedTools {
  @Policy(policy)
  @Tool({
    name: "policy_typed_tool",
    description: "A tool with declarative policy intent.",
    schema: { type: "object" },
  })
  execute(input: { readonly requestId: string }): string {
    return input.requestId;
  }
}

void new PolicyTypedTools();
