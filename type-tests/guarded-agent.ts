import { Agent, buildGuardedAgent } from "../src/agent.js";
import { Policy, Tool } from "../src/index.js";

class GuardedTypedAgent {
  @Policy({ authorization: "required" })
  @Tool({
    name: "guarded_agent_echo",
    description: "Echo a value through a guarded LangChain agent.",
    schema: { type: "object" },
  })
  echo(input: { readonly value: string }): string {
    return input.value;
  }
}

const model = {} as Parameters<typeof buildGuardedAgent>[1]["model"];

const agent = buildGuardedAgent(new GuardedTypedAgent(), {
  model,
  async guard({ definition, input, policy }) {
    void definition.name;
    void input;
    void policy.authorization;
  },
});

void agent;

@Agent({ systemPrompt: "Use the tools." })
class DecoratedGuardedTypedAgent extends GuardedTypedAgent {}

void new DecoratedGuardedTypedAgent();
