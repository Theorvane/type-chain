import { Policy, Tool, type ToolPolicyGuard } from "../src/index.js";
import { toGuardedLangChainTools } from "../src/langchain.js";

class GuardedLangChainTools {
  @Policy({ approval: "required" })
  @Tool({
    name: "guarded_langchain_echo",
    description: "Echo a value through a guarded LangChain adapter.",
    schema: { type: "object" },
  })
  echo(input: { readonly value: string }): string {
    return input.value;
  }
}

const guard: ToolPolicyGuard = async ({ definition, input, policy }) => {
  void definition.name;
  void input;
  void policy.approval;
};

const tools = toGuardedLangChainTools(new GuardedLangChainTools(), guard);

void tools[0]?.invoke({ value: "typed" });
