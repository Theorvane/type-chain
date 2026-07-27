import {
  Policy,
  Tool,
  type ToolPolicyGuard,
  withToolPolicyGuard,
} from "../src/index.js";

class GuardedTypedTools {
  @Policy({ authorization: "required" })
  @Tool({
    name: "guarded_echo",
    description: "Echo a guarded typed value.",
    schema: { type: "object" },
  })
  echo(input: { readonly value: string }): string {
    return input.value;
  }
}

const guard: ToolPolicyGuard = async ({ definition, input, policy }) => {
  void definition.name;
  void input;
  void policy.authorization;
};

const definitions = withToolPolicyGuard(new GuardedTypedTools(), guard);

void definitions[0]?.invoke({ value: "typed" });
