// THROWAWAY #19: narrowing/reconstruction experiment, not production core code.
// Factory typing is borrowed from the separately bounded #9 proof.
import { selectors, type Page, type Locator } from "@playwright/test";
import { createRequire } from "node:module";

export type LocatorFactoryContext = Readonly<{ page: Page; scope: Locator | null }>;
export type LocatorFactory = (context: LocatorFactoryContext) => Locator;
export type Target = string | Locator | LocatorFactory;
type FilterOptions = NonNullable<Parameters<Locator["filter"]>[0]>;

function captureFilterOptions(options: FilterOptions | undefined): FilterOptions | undefined {
  if (options === undefined) return undefined;
  const copy: FilterOptions = {};
  // Read supported fields once, including inherited getters and non-enumerable properties.
  for (const key of ["has", "hasNot", "hasText", "hasNotText", "visible"] as const) {
    const value = options[key];
    if (value !== undefined)
      Object.defineProperty(copy, key, { value, enumerable: true, writable: true });
  }
  for (const key of ["hasText", "hasNotText"] as const) {
    const value = copy[key];
    if (value instanceof RegExp) copy[key] = new RegExp(value.source, value.flags);
  }
  return Object.freeze(copy);
}

type TextDescription = string | Readonly<{ source: string; flags: string }>;
type FilterDescription = Readonly<
  Omit<FilterOptions, "hasText" | "hasNotText"> & {
    hasText?: TextDescription;
    hasNotText?: TextDescription;
  }
>;
type Operation = Readonly<
  | { kind: "first" | "last" }
  | { kind: "nth"; index: number }
  | { kind: "filter"; options: FilterDescription | undefined }
  | {
      kind:
        | "withClass"
        | "withoutClass"
        | "withAnyClass"
        | "withTestId"
        | "withoutTestId"
        | "matching"
        | "withText"
        | "withoutText"
        | "visible"
        | "hidden"
        | "withRole"
        | "withAttribute"
        | "withoutAttribute";
      criteria: unknown;
    }
>;
type Occurrence = Readonly<{
  parent: PageObject | null;
  derivation: Readonly<{ source: DomPageObject; operation: Operation }> | null;
}>;
const occurrences = new WeakMap<PageObject, Occurrence>();
const reconstructInstance: unique symbol = Symbol("reconstruct instance");

function describeFilter(options: FilterOptions | undefined): FilterDescription | undefined {
  if (options === undefined) return undefined;
  const describeText = (value: string | RegExp): TextDescription =>
    typeof value === "string" ? value : Object.freeze({ source: value.source, flags: value.flags });
  const { hasText, hasNotText, ...rest } = options;
  return Object.freeze({
    ...rest,
    ...(hasText === undefined ? {} : { hasText: describeText(hasText) }),
    ...(hasNotText === undefined ? {} : { hasNotText: describeText(hasNotText) }),
  });
}

// Diagnostic seam for this proof only, not a proposed production parent/report API.
export function inspectOccurrenceForProof(object: PageObject): Occurrence {
  const occurrence = occurrences.get(object);
  if (!occurrence) throw new Error("Not a page object from this proof.");
  return occurrence;
}

// Validate the engine boundary, not the complete CSS grammar. Full CSS parsing
// remains Playwright's responsibility when the Locator is actually evaluated.
function cssTarget(input: string): string {
  let body = input.trim();
  const engine = /^([\w:+*-]+)\s*=/.exec(body);
  if (engine) {
    if (engine[1] !== "css") throw new Error("String targets must use one CSS selector body.");
    body = body.slice(engine[0].length).trim();
  }
  if (!body || /^\(*\/\//.test(body) || body.startsWith("..") || /^["'`]/.test(body)) {
    throw new Error("A non-empty CSS selector body is required.");
  }
  let quote: string | undefined;
  for (let index = 0; index < body.length; index++) {
    const char = body[index];
    if (char === "\\") {
      index++;
    } else if (quote === char) {
      quote = undefined;
    } else if (!quote && (char === '"' || char === "'" || char === "`")) {
      quote = char;
    } else if (!quote && char === ">" && body[index + 1] === ">") {
      throw new Error("CSS string targets do not support selector-engine chains.");
    }
  }
  return `css=${body}`;
}

// Split only top-level list separators; native Playwright still parses CSS.
function selfMatchingSelector(body: string): string {
  const branches: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: string | undefined;
  for (let index = 0; index < body.length; index++) {
    const char = body[index];
    if (char === "\\") index++;
    else if (quote === char) quote = undefined;
    else if (quote) continue;
    else if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "/" && body[index + 1] === "*") {
      const end = body.indexOf("*/", index + 2);
      index = end < 0 ? body.length : end + 1;
    } else if (char === "(" || char === "[") depth++;
    else if (char === ")" || char === "]") depth--;
    else if (char === "," && depth === 0) {
      branches.push(body.slice(start, index).trim());
      start = index + 1;
    }
  }
  branches.push(body.slice(start).trim());
  if (branches.some((branch) => !branch)) return body;
  return branches
    .map((branch) => {
      const head = branch.replace(/^(?:\s|\/\*[\s\S]*?\*\/)*/, "");
      return /^[>+~]/.test(head) ? `:scope ${branch}` : `:scope:is(${branch})`;
    })
    .join(", ");
}

function isLocator(value: unknown): value is Locator {
  const candidate = value as Partial<Locator> | null;
  return (
    !!candidate &&
    typeof candidate.page === "function" &&
    typeof candidate.locator === "function" &&
    typeof candidate.count === "function"
  );
}

function validateLocator(value: unknown, page: Page): Locator {
  if (!isLocator(value)) {
    throw new Error("Target resolution must return a synchronous Playwright Locator.");
  }
  if (value.page() !== page) throw new Error("The Locator must belong to the same Page.");
  return value;
}

export interface RootReference {
  readonly page: Page;
  readonly root: RootReference | null;
}
export type UnboundRoot = RootReference | null;
export const defaultInstanceType: unique symbol = Symbol("default instance type");
type Class = Function & { prototype: PageObject<UnboundRoot> };
type Default<I extends PageObject<UnboundRoot>> = I[typeof defaultInstanceType]["instance"];
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Erased<Args extends object> = true extends { [K in keyof Args]: IsAny<Args[K]> }[keyof Args]
  ? true
  : false;

export type Result<C extends Class> =
  Erased<C["prototype"][typeof defaultInstanceType]["parameters"]> extends true
    ? Default<C["prototype"]> extends C["prototype"]
      ? Default<C["prototype"]>
      : never
    : C["prototype"];
type IsAny<T> = 0 extends 1 & T ? true : false;
type Context<Root extends UnboundRoot> =
  IsAny<Root> extends true ? never : null extends Root ? Page | PageObject<Root> : PageObject<Root>;
type TargetArguments<Instance> =
  Instance extends DomPageObject<UnboundRoot>
    ? Instance extends { defaultTarget: Target }
      ? [target?: Target]
      : [target: Target]
    : [];

export class PageObject<Root extends UnboundRoot = UnboundRoot> {
  declare readonly [defaultInstanceType]: { instance: PageObject; parameters: { root: Root } };
  readonly #parent: PageObject<Root> | null;
  readonly #page: Page;
  readonly #root: Root;
  readonly #concreteClass: Function;
  readonly #asRoot: boolean;
  #complete = false;

  protected constructor(context: Page | PageObject<Root>, _target?: Target, asRoot = false) {
    this.#concreteClass = new.target;
    this.#asRoot = asRoot;
    this.#parent = context instanceof PageObject ? context : null;
    this.#page = this.#parent ? this.#parent.page : (context as Page);
    this.#root = (asRoot ? this : this.#parent ? this.#parent.root : null) as Root;
    occurrences.set(this, Object.freeze({ parent: this.#parent, derivation: null }));
  }

  get page(): Page {
    return this.#page;
  }
  get root(): Root {
    return this.#root;
  }
  protected get scope(): Locator | null {
    return this.#parent ? this.#parent.scope : null;
  }

  finishConstruction(target?: Target): void {
    if (this instanceof DomPageObject) this.validateOwnTarget();
    else if (target !== undefined) throw new Error("Grouping page objects do not accept targets.");
    this.#complete = true;
  }

  protected assertInitialized(): void {
    if (!this.#complete) throw new Error("Locator access during page-object initialization.");
    this.#parent?.assertInitialized();
  }

  [reconstructInstance](target: Target): this {
    if (!this.#complete) throw new Error("Narrowing during page-object initialization.");
    const object = Reflect.construct(this.#concreteClass, [
      this.#parent ?? this.#page,
      target,
      this.#asRoot,
    ]) as this;
    object.finishConstruction(target);
    return object;
  }

  static create<C extends Class>(
    this: C,
    context: Context<Result<C>["root"]>,
    ...[target]: TargetArguments<Result<C>>
  ): Result<C> {
    const object = Reflect.construct(this, [context, target, false]) as PageObject<UnboundRoot>;
    object.finishConstruction(target);
    return object as Result<C>;
  }
}

// Public registration, but global setup/worker ownership is intentionally unresolved.
await selectors.register("proofself19", () => ({
  query(root: Node, selector: string) {
    return this.queryAll(root, selector)[0] ?? null;
  },
  queryAll(root: Node, selector: string): Element[] {
    if (!(root instanceof Element)) return [];
    const c = JSON.parse(selector) as {
      mode: string;
      tokens?: string[];
      name?: string;
      names?: string[];
      value?: string | { source: string; flags: string };
      negative?: boolean;
    };
    let result: boolean;
    if (c.tokens) {
      const found = c.tokens.map((token) => root.classList.contains(token));
      result =
        c.mode === "any"
          ? found.some(Boolean)
          : c.mode === "none"
            ? !found.some(Boolean)
            : found.every(Boolean);
    } else {
      result = (c.names ?? [c.name!]).some((name) => {
        const actual = root.getAttribute(name);
        return c.value === undefined
          ? actual !== null
          : actual !== null &&
              (typeof c.value === "string"
                ? actual === c.value
                : new RegExp(c.value.source, c.value.flags).test(actual));
      });
      if (c.negative) result = !result;
    }
    return result ? [root] : [];
  },
}));
const captureValue = (value: string | RegExp): string | RegExp =>
  typeof value === "string" ? value : new RegExp(value.source, value.flags);
const describeValue = (value: string | RegExp | undefined) =>
  value instanceof RegExp ? Object.freeze({ source: value.source, flags: value.flags }) : value;

// ISOLATED PRIVATE ADAPTERS: candidate evidence only, never production approval.
function nativePredicate(locator: Locator, engine: "role" | "testid"): string {
  const version = (
    createRequire(import.meta.url)("@playwright/test/package.json") as { version: string }
  ).version;
  if (version !== "1.64.1")
    throw new Error("Private predicate adapter requires exactly Playwright 1.64.1.");
  const selector = (locator as Locator & { _selector?: unknown })._selector;
  if (
    typeof selector !== "string" ||
    !(engine === "role"
      ? /^internal:role=[a-z]+(?:\[|$)/.test(selector)
      : selector.startsWith("internal:testid=["))
  )
    throw new Error("Unsupported Playwright native predicate shape (requires 1.64.1).");
  return selector;
}

function testIdAttributes(page: Page): readonly string[] {
  const selector = nativePredicate(page.getByTestId("proof19-config-sentinel"), "testid");
  const prefix = "internal:testid=[";
  const suffix = '="proof19-config-sentinel"s]';
  const fail = (): never => {
    throw new Error("Unsupported Playwright test-ID adapter encoding (requires 1.64.1).");
  };
  if (!selector.startsWith(prefix) || !selector.endsWith(suffix)) return fail();
  const encoded = selector.slice(prefix.length, -suffix.length).trim();
  let decoded: string;
  if (/^"(?:[^"\\]|\\[\s\S])*"$/.test(encoded) || /^'(?:[^'\\]|\\[\s\S])*'$/.test(encoded)) {
    // Pinned native attribute tokens discard the escape marker, not JSON-decode
    // its following character. Native multi-attribute names are quoted tokens.
    decoded = encoded.slice(1, -1).replace(/\\([\s\S])/g, "$1");
  } else if (/^[\w\u0080-\uFFFF-]+$/u.test(encoded)) {
    decoded = encoded;
  } else return fail();
  const names = decoded.split(",");
  // Fail closed outside the supported literal native attribute-name encoding.
  // In particular never truncate a malformed configuration at '=' or ']'.
  const identifier = /^-?(?:[A-Za-z_\u0080-\uFFFF]|-)[\w\u0080-\uFFFF-]*$/u;
  if (names.some((name) => name === "-" || !identifier.test(name))) return fail();
  return Object.freeze(names);
}

export class DomPageObject<Root extends UnboundRoot = UnboundRoot> extends PageObject<Root> {
  declare readonly [defaultInstanceType]: { instance: DomPageObject; parameters: { root: Root } };
  readonly defaultTarget: Target | undefined = undefined;
  readonly #explicitTarget: Target | undefined;
  readonly #rootFallback: string | undefined;
  #selectedTarget: Target | undefined;
  #locator: Locator | undefined;
  #resolving = false;

  protected constructor(context: Page | PageObject<Root>, target?: Target, asRoot = false) {
    super(context, target, asRoot);
    this.#explicitTarget = target;
    this.#rootFallback = asRoot ? "html" : undefined;
  }

  first(): this {
    return this.#derive({ kind: "first" }, (locator) => locator.first());
  }

  last(): this {
    return this.#derive({ kind: "last" }, (locator) => locator.last());
  }

  nth(index: number): this {
    return this.#derive({ kind: "nth", index }, (locator) => locator.nth(index));
  }

  filter(options?: Parameters<Locator["filter"]>[0]): this {
    const captured = captureFilterOptions(options);
    return this.#derive({ kind: "filter", options: describeFilter(captured) }, (locator) =>
      locator.filter(captured),
    );
  }

  withClass(...tokens: [string, ...string[]]): this {
    return this.#classes("withClass", "all", tokens);
  }
  withoutClass(...tokens: [string, ...string[]]): this {
    return this.#classes("withoutClass", "none", tokens);
  }
  withAnyClass(...tokens: [string, ...string[]]): this {
    return this.#classes("withAnyClass", "any", tokens);
  }
  #classes(
    kind: "withClass" | "withoutClass" | "withAnyClass",
    mode: string,
    tokens: string[],
  ): this {
    if (
      !tokens.length ||
      tokens.some((token) => typeof token !== "string" || !token || /[\t\n\f\r ]/.test(token))
    )
      throw new Error("Expected nonempty whole class tokens without ASCII whitespace.");
    const criteria = Object.freeze([...tokens]);
    return this.#derive({ kind, criteria }, (source) =>
      source.locator(`proofself19=${JSON.stringify({ mode, tokens: criteria })}`),
    );
  }
  withAttribute(name: string, value?: string | RegExp): this {
    return this.#attribute("withAttribute", name, value);
  }
  withoutAttribute(name: string, value?: string | RegExp): this {
    return this.#attribute("withoutAttribute", name, value);
  }
  #attribute(
    kind: "withAttribute" | "withoutAttribute" | "withTestId" | "withoutTestId",
    name: string,
    value?: string | RegExp,
  ): this {
    const captured = value === undefined ? undefined : captureValue(value);
    const criteria = Object.freeze({ name, value: describeValue(captured) });
    return this.#derive({ kind, criteria }, (source) =>
      source.locator(
        `proofself19=${JSON.stringify({ mode: "attribute", ...criteria, negative: kind.startsWith("without") })}`,
      ),
    );
  }
  withTestId(value: string | RegExp): this {
    return this.#testIds("withTestId", value);
  }
  withoutTestId(value: string | RegExp): this {
    return this.#testIds("withoutTestId", value);
  }
  #testIds(kind: "withTestId" | "withoutTestId", value: string | RegExp): this {
    const criteria = Object.freeze({
      names: testIdAttributes(this.page),
      value: describeValue(captureValue(value)),
    });
    return this.#derive({ kind, criteria }, (source) =>
      source.locator(
        `proofself19=${JSON.stringify({ mode: "attribute", ...criteria, negative: kind === "withoutTestId" })}`,
      ),
    );
  }
  withText(value: string | RegExp): this {
    const captured = captureValue(value);
    return this.#derive({ kind: "withText", criteria: describeValue(captured) }, (source) =>
      source.filter({ hasText: captured }),
    );
  }
  withoutText(value: string | RegExp): this {
    const captured = captureValue(value);
    return this.#derive({ kind: "withoutText", criteria: describeValue(captured) }, (source) =>
      source.filter({ hasNotText: captured }),
    );
  }
  visible(): this {
    return this.#derive({ kind: "visible", criteria: true }, (source) =>
      source.filter({ visible: true }),
    );
  }
  hidden(): this {
    return this.#derive({ kind: "hidden", criteria: false }, (source) =>
      source.filter({ visible: false }),
    );
  }
  withRole(...[role, options]: Parameters<Locator["getByRole"]>): this {
    const captured: NonNullable<typeof options> = {};
    for (const key of [
      "checked",
      "description",
      "disabled",
      "exact",
      "expanded",
      "includeHidden",
      "level",
      "name",
      "pressed",
      "selected",
    ] as const) {
      const value = options?.[key];
      if (value !== undefined)
        Object.defineProperty(captured, key, {
          value: value instanceof RegExp ? captureValue(value) : value,
          enumerable: true,
        });
    }
    const criteria = Object.freeze({
      role,
      options: Object.freeze(
        Object.fromEntries(
          Object.entries(captured).map(([key, value]) => [
            key,
            value instanceof RegExp ? describeValue(value) : value,
          ]),
        ),
      ),
    });
    const predicate = nativePredicate(this.page.getByRole(role, captured), "role");
    // Native generated role query is frame independent; internal:and evaluates it
    // at the source query's original root, including the html element itself.
    return this.#derive({ kind: "withRole", criteria }, (source) =>
      source.locator(`internal:and=${JSON.stringify(predicate)}`),
    );
  }
  matching(
    input: string | Locator | ((context: Readonly<{ page: Page; scope: Locator }>) => Locator),
  ): this {
    const captured = typeof input === "string" ? cssTarget(input).slice(4) : input;
    return this.#derive({ kind: "matching", criteria: captured }, (source) => {
      if (typeof captured === "string") {
        // Native CSS evaluator retains Playwright extensions. Relative selectors
        // run normally then intersect; they never become containment filters.
        return source.and(source.locator(`css=${selfMatchingSelector(captured)}`));
      }
      return source.and(
        validateLocator(
          typeof captured === "function" ? captured({ page: this.page, scope: source }) : captured,
          this.page,
        ),
      );
    });
  }

  #derive(operation: Operation, transform: (source: Locator) => Locator): this {
    const object = this[reconstructInstance](() => transform(this.locator));
    const { parent } = inspectOccurrenceForProof(object);
    occurrences.set(
      object,
      Object.freeze({
        parent,
        derivation: Object.freeze({ source: this, operation: Object.freeze(operation) }),
      }),
    );
    return object;
  }

  get effectiveTarget(): Target {
    if (this.#selectedTarget !== undefined) return this.#selectedTarget;
    const declared = this.#explicitTarget !== undefined ? this.#explicitTarget : this.defaultTarget;
    const target = declared === undefined ? this.#rootFallback : declared;
    if (target === undefined || (typeof target === "string" && !target.trim())) {
      throw new Error("A DOM target is required.");
    }
    return target;
  }

  validateOwnTarget(): void {
    const target = this.effectiveTarget;
    if (typeof target !== "string" && typeof target !== "function" && !isLocator(target)) {
      throw new Error("A target must be a CSS string, Locator, or locator factory.");
    }
    this.#selectedTarget = typeof target === "string" ? cssTarget(target) : target;
  }
  get locator(): Locator {
    this.assertInitialized();
    if (this.#locator) return this.#locator;
    if (this.#resolving) throw new Error("Cyclic target resolution.");
    this.#resolving = true;
    try {
      const target = this.effectiveTarget;
      const result =
        typeof target === "string"
          ? (super.scope ?? this.page).locator(target)
          : typeof target === "function"
            ? target({ page: this.page, scope: super.scope })
            : target;
      return (this.#locator = validateLocator(result, this.page));
    } finally {
      this.#resolving = false;
    }
  }
  protected override get scope(): Locator {
    return this.locator;
  }
}

export function rootFixture<C extends Class>(
  Class: C & (Result<C> extends Result<C>["root"] ? unknown : never),
  ...[target]: Result<C> extends DomPageObject<UnboundRoot> ? [target?: Target] : []
) {
  return async ({ page }: { page: Page }, use: (app: Result<C>) => Promise<void>) => {
    const app = Reflect.construct(Class, [page, target, true]) as PageObject<UnboundRoot>;
    app.finishConstruction(target);
    await use(app as Result<C>);
  };
}

// Borrowed factory-result check. The separate #9 proof supplies source enforcement;
// this directory does not broaden or re-prove that authoring contract.
// This verifies result/default conformance. Constructor compatibility is coarse:
// TypeScript constructor bivariance leaves narrowed constructors unchecked here;
// the required source rule rejects all author constructor overrides.
// Expected is the bare instance type, so TypeScript applies its declared defaults.
export function checkLibrary<Expected extends PageObject<UnboundRoot>>() {
  return <C extends Class>(
    Class: C &
      (Equal<Result<C>, Expected> extends true ? unknown : never) &
      (C extends typeof PageObject<Expected["root"]> ? unknown : never),
  ): C => Class;
}

checkLibrary<PageObject>()(PageObject);
checkLibrary<DomPageObject>()(DomPageObject);
