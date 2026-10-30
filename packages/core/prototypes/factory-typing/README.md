# Throwaway factory-typing proof (#9)

The author selected enforced authoring rules: complete generic metadata and
conformance checks, inherited constructors, field-based custom state, and explicit
rejection of unsupported generic default changes. This directory proves that
bounded contract. It is **not a production implementation** of `@pomeranian/core`:
there is no package manifest, export, or production integration. Names and helper
spellings remain prototype spellings.

Run from the repository root after the normal workspace install and Chromium setup:

```sh
node packages/core/prototypes/factory-typing/run.mjs
```

`--types-only` runs the source-rule and compiler proofs without Chromium. The runner
copies sources to a temporary directory and links installed workspace dependencies.
It installs nothing and needs no Storybook. Failed runs retain their scratch files;
successful runs remove them. The complete proof requires **both source enforcement
and strict TypeScript**. Compiler checks alone do not provide the selected guarantee.

Verified with TypeScript 7.0.2, Oxlint 1.89.0, and Playwright 1.64.1:

- Accepted authoring modules and a separate generic/private-state/app-subclass
  fixture pass the source rule and strict compiler.
- Twenty-seven source mutations are rejected with their intended diagnostics, including
  omitted metadata/parameters/checks, constructor/factory overrides, suppressions,
  unvalidated ancestors, constructor specialization, widened fixture classes, factory extraction, inner
  diagnostic suppressions, index signatures, and exported alias forms.
- All three counterexample modules are rejected by the source rule. An unrelated
  inherited numeric default produces the actual `TS2416` compiler diagnostic.
- Fourteen Chromium checks pass: twelve demonstrate working behavior, while two
  confirm underlying TypeScript constructor, fixture-widening, and parameter-map hazards. Those unsafe classes
  are deliberately excluded from accepted authoring sources and rejected separately.

## Selected library-author contract

Every generic class must declare its own type-only metadata with the bare instance
name (which applies its declared defaults) and a direct entry for each independent
parameter. It must also have an unsuppressed top-level conformance assertion:

```ts
class ValueButton<R extends UnboundRoot = UnboundRoot, Value = string> extends LibraryButton<R> {
  declare readonly [defaultInstanceType]: {
    instance: ValueButton;
    parameters: { root: R; value: Value };
  };
  readonly #value: Value | undefined = undefined;
  value(): Value | undefined {
    return this.#value;
  }
}
checkLibrary<ValueButton>()(ValueButton);

// Concrete app classes need neither fresh metadata nor conformance assertions.
class AppValueButton extends ValueButton<App, number> {
  #count = 0;
  increment(): number {
    return ++this.#count;
  }
}
```

All author classes retain the inherited constructor and static create method.
Initialize private/custom state in ordinary instance fields. Additional constructor
arguments, narrower context/target parameters, changed root-mode parameters, and
custom constructors with otherwise matching signatures are excluded. Only the
trusted `PageObject` and `DomPageObject` framework declarations implement constructors;
only trusted framework code implements the inherited create path.

The helper checks factory-result/default-instance equality. Its extra protected
constructor comparison is only coarse compatibility: constructor bivariance means
it does not enforce exact argument acceptance. The **source rule's constructor
prohibition** supplies that part of the selected contract.

`authoring-plugin.mjs` is a throwaway Oxlint source rule, using the installed parser.
`authoring.oxlint.json` enables it; `authoring-checks.mjs` exercises actual lint and
compiler processes. The approved examples in `probe.mts` and `contracts.mts` are
always checked by the runner, along with the accepted consumer module
`examples.spec.mts`. The temporary regression fixture is checked too.

This bounded rule uses top-level named class declarations, direct inheritance from
checked class declarations, and canonical imports of the helper/symbol. Imports of
ancestors are limited to the two checked prototype modules (`./probe.mts` and
`./contracts.mts`). Constructor aliases, class expressions, nested declarations,
mixins, and constructor-instantiation expressions are rejected rather than guessed.
Required metadata/checks cannot suppress compiler diagnostics, including comments
inside the declaration/assertion. Parameter maps use plain property signatures;
index signatures are excluded. Factory receivers and rootFixture arguments must
be direct checked class identifiers; constructor-valued aliases and extracted
factory/helper values are rejected. The checked class modules use inline
class/function/type exports; exported variables, export lists, default exports,
and namespace merging are excluded to keep imported class identities traceable. Like any lint rule,
its guarantee assumes running the required rule with its checked configuration;
changing/disabling the checking pipeline is outside that guarantee. It is not a
repository-wide or published library-author tool. Production packaging must carry
forward equivalent source enforcement and check the full authoring source set.

## Constructor, factory, and fixture types

`probe.mts` contains the executable, authoritative declarations:

```ts
protected constructor(
  context: Page | PageObject<Root>,
  target?: string,
  asRoot?: boolean,
);

static create<C extends Class>(
  this: C,
  context: Context<Result<C>["root"]>,
  ...target: TargetArguments<Result<C>>
): Result<C>;
```

`Class` is `Function & { prototype: PageObject<UnboundRoot> }`, without a public
construct signature. `UnboundRoot` is `RootReference | null`. `Result<C>` chooses
that class's declared default instance when declared parameters are erased, and
its actual prototype type for concrete subclasses. Every generic parameter must
be represented in the metadata, which the source rule enforces.

`Context` permits Page only for a nullable root, otherwise requiring a parent with
compatible root typing. `TargetArguments` is empty for groups, optional for a DOM
instance with definite string defaultTarget, and required for other ordinary DOM
construction. Consumers use no casts, public constructors, per-app factories, or
empty wrappers. The framework's internal construction assertions remain localized.

`rootFixture(Class, ...target)` requires the constructed instance to be assignable
to its declared root type and preserves Result<C> in the callback. It supplies root
mode before child fields initialize. DOM-root targets are optional (html fallback);
groups have no target argument. Null-only or incompatible self-root types reject.

## Behavior and limits

| Case                                                   | Verified result                                                                                                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direct LibraryButton with Page or parent               | Exactly LibraryButton<UnboundRoot>, with its nominal API and neutral/nullable root-dependent methods, without any leakage.                                                                  |
| AppButton extends LibraryButton<App>                   | Exact concrete type, custom methods, definite App root and App-returning methods; ordinary Page construction rejected.                                                                      |
| Null and App-or-null classes                           | Their own context and root contracts retained; null-only objects reject App-root parents.                                                                                                   |
| Instance defaultTarget and groups                      | Children can precede parent defaults; inherited children use subclass defaults; groups forward scope. Explicit target wins, then instance default, then html only for designated DOM roots. |
| Root fixtures                                          | Self-reference exists before child fields; callback retains the concrete instance; incompatible roots reject; independent instances retain separate identity/state.                         |
| Additional declared generics and private fields        | Direct factories apply their actual defaults; concrete app classes can bind independent parameters; field-based state initializes normally.                                                 |
| Generic defaultTarget overrides                        | Every generic subclass redeclares metadata and checks conformance, even if structurally equivalent. Runtime constructor identity and overrides survive.                                     |
| Changed root default/constraint                        | Supported when its own metadata remains compatible with the ancestor default instance. Stale or omitted declarations are source errors.                                                     |
| Independent string default narrowed to a literal       | Supported with its own metadata/check.                                                                                                                                                      |
| Independent string default changed to unrelated number | Rejected by inherited metadata covariance (TS2416). A fresh family/representation would be needed; this proof does not support that override.                                               |
| Constructor instantiation expressions                  | Excluded by the source rule; concrete subclasses are the demonstrated binding mechanism. The earlier unchecked factory still returns neutral metadata when used this way.                   |
| Custom constructors or per-app factory overrides       | Rejected by the source rule; arbitrary constructor/state reconstruction is not supported.                                                                                                   |

Targets in this proof are strings only, sufficient to test initialization. Locator
and target-factory inputs, mutation/caching, narrowing/reconstruction, and naming
remain separate tickets. Prototype click/confirmation methods illustrate consumer
behavior without settling the production operation API.

## Source inventory and earlier experiments

- `probe.mts`: inherited factories, protected framework constructors, fixture, lazy
  scope/default timing, representative app/library classes, conformance helper.
- `contracts.mts`: accepted generic/private-state examples and exact expected types.
- `counterexamples.mts`: intentionally unsafe or unsupported generic/default/state
  examples. Its functions are never run; negative diagnostics are explicitly checked.
- `constructor-counterexamples.mts` and its spec: narrowed constructors accepted by
  TypeScript/helper alone but rejected by the selected source rule. The browser
  test independently confirms four runtime failures.
- `examples.spec.mts`: twelve browser examples for accepted behavior.
- `rule-counterexamples.mts` and its spec: retained review regressions for a
  widened self-incompatible fixture class and an index-signature/inner-suppression
  combination. Both pass TypeScript alone, fail the source rule, and demonstrate
  runtime failures or false types when run without that rule.
- `authoring-plugin.mjs`, `authoring.oxlint.json`, `authoring-checks.mjs`: required
  source enforcement plus parser/compiler regression checks, confined to this proof.

An alternate constructor-owner metadata experiment detected changed generic defaults
but missed independent parameters absent from its map and rejected some legitimate
constructor constraints. It was not selected. These experiments do not prove that
all alternative TypeScript encodings are impossible. The selected conjunction of
source rules, strict checking, and inherited-constructor restrictions is the result.

## Primary references

- [Oxlint JavaScript plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html): installed parser integration; this API is alpha and the proof uses the pinned workspace version.
- [TypeScript static members and class type parameters](https://www.typescriptlang.org/docs/handbook/2/classes.html#type-parameters-in-static-members).
- [Strict function types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-6.html#strict-function-types): constructors are excluded from strict parameter contravariance, explaining the earlier narrowed-constructor failures.
- [TypeScript issue #30991](https://github.com/microsoft/TypeScript/issues/30991): protected/private constructors and public construct-signature utilities.
