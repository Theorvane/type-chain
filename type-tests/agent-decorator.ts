import { FakeToolCallingModel } from "langchain";

import { Agent, buildAgent, Tool } from "../src/index.js";

const schema = { type: "object" };

@Agent({ systemPrompt: "Use typed tools." })
class TypedAgentTools {
  @Tool({
    name: "typed_echo",
    description: "Echo a typed value.",
    schema,
  })
  echo(input: { readonly value: string }): string {
    return input.value;
  }
}

const agent = buildAgent(new TypedAgentTools(), {
  model: new FakeToolCallingModel({ toolCalls: [] }),
});

void agent;
