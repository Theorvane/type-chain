type RuntimeSchema = object;
// biome-ignore lint/suspicious/noExplicitAny: TypeScript's standard ClassMethodDecoratorContext requires an any-parameter callable constraint.
type DecoratedMethod<This> = (this: This, ...args: any[]) => unknown;

type ToolOwner = object;

export interface ToolOptions {
  readonly name: string;
  readonly description: string;
  readonly schema: RuntimeSchema;
}

export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly schema: RuntimeSchema;
  readonly invoke: (input: unknown) => unknown;
}

interface ToolRegistration {
  readonly options: Readonly<ToolOptions>;
  readonly invoke: (instance: object, input: unknown) => unknown;
}

const toolRegistrations = new WeakMap<ToolOwner, ToolRegistration[]>();
const registeredMethods = new WeakMap<ToolOwner, Set<string | symbol>>();
const portableToolName = /^[a-z][a-z0-9_]*$/;

export function Tool(options: ToolOptions) {
  validateToolOptions(options);
  const snapshot = Object.freeze({ ...options });

  return function registerTool<
    This extends object,
    Value extends DecoratedMethod<This>,
  >(value: Value, context: ClassMethodDecoratorContext<This, Value>): void {
    if (
      context.kind !== "method" ||
      context.static ||
      context.private ||
      typeof value !== "function"
    ) {
      throw new TypeError("@Tool can only decorate a public instance method.");
    }

    context.addInitializer(function registerToolMetadata(this: unknown) {
      if (typeof this !== "object" || this === null) {
        throw new TypeError("Tool metadata requires a class instance.");
      }

      const owner = findDeclarationOwner(this, context.name, value);
      const methods = registeredMethods.get(owner) ?? new Set();

      if (methods.has(context.name)) {
        return;
      }

      const registrations = toolRegistrations.get(owner) ?? [];

      if (
        registrations.some(
          (registration) => registration.options.name === snapshot.name,
        )
      ) {
        throw new Error(`Duplicate tool name registered: ${snapshot.name}`);
      }

      methods.add(context.name);
      registrations.push({
        options: snapshot,
        invoke: (instance, input) => Reflect.apply(value, instance, [input]),
      });
      registeredMethods.set(owner, methods);
      toolRegistrations.set(owner, registrations);
    });
  };
}

export function getToolDefinitions(
  instance: object,
): readonly ToolDefinition[] {
  const names = new Set<string>();
  const definitions = findDeclarationOwners(instance).flatMap((owner) => {
    const registrations = toolRegistrations.get(owner) ?? [];

    return registrations.map((registration) => {
      const { name } = registration.options;

      if (names.has(name)) {
        throw new Error(`Duplicate tool name registered: ${name}`);
      }

      names.add(name);
      return Object.freeze({
        name,
        description: registration.options.description,
        schema: registration.options.schema,
        invoke: (input: unknown): unknown =>
          registration.invoke(instance, input),
      });
    });
  });

  return Object.freeze(definitions);
}

function validateToolOptions(options: ToolOptions): void {
  if (!portableToolName.test(options.name)) {
    throw new TypeError(
      "Tool names must use portable snake_case beginning with a lowercase letter.",
    );
  }

  if (options.description.trim().length === 0) {
    throw new TypeError("Tool descriptions must be non-empty.");
  }

  if (options.schema === null || typeof options.schema !== "object") {
    throw new TypeError(
      "Tool options require an explicit non-null runtime schema object.",
    );
  }
}

function findDeclarationOwner(
  instance: object,
  methodName: string | symbol,
  method: object,
): ToolOwner {
  for (
    let prototype = Object.getPrototypeOf(instance);
    prototype !== null;
    prototype = Object.getPrototypeOf(prototype)
  ) {
    if (
      Object.getOwnPropertyDescriptor(prototype, methodName)?.value === method
    ) {
      return getConstructor(prototype);
    }
  }

  throw new TypeError("Tool metadata could not locate its declaring class.");
}

function findDeclarationOwners(instance: object): readonly ToolOwner[] {
  const owners: ToolOwner[] = [];

  for (
    let prototype = Object.getPrototypeOf(instance);
    prototype !== null;
    prototype = Object.getPrototypeOf(prototype)
  ) {
    const owner = getConstructor(prototype);

    if (owner !== Object && !owners.includes(owner)) {
      owners.unshift(owner);
    }
  }

  return owners;
}

function getConstructor(prototype: object): ToolOwner {
  const owner = prototype.constructor;

  if (typeof owner !== "function") {
    throw new TypeError("Tool metadata requires an object with a constructor.");
  }

  return owner;
}
