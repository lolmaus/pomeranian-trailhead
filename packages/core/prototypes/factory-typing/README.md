# Throwaway factory-typing proof (#9)

This is discussion evidence, **not an approved or production implementation** of
`@pomeranian/core`. There is no package manifest, export, or production integration.
The required complete inheritance safeguard is **not yet established**. Ticket #9
must remain open until the author chooses the remaining contract.

Run from the repository root after the normal workspace install and Chromium setup:

```sh
node packages/core/prototypes/factory-typing/run.mjs
```

Use `--types-only` to run just the strict compiler proof. The runner copies the
files into a temporary directory, links the installed test-support dependencies,
and uses the repository's installed TypeScript and Playwright. It installs nothing
and needs no Storybook. Successful runs remove the temporary copy; failed runs
print its path for inspection.

Verified with TypeScript 7.0.2 and Playwright 1.64.1: strict compilation passes and
13 Chromium examples pass. **One passing browser example confirms four unsound
constructor cases by asserting that their accepted calls throw.** Green checks
are evidence for the stated successes and limitations, not proof of soundness.

## Files and evidence

| File                                   | Purpose                                                                                                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `probe.mts`                            | Inherited factory, protected construction, root fixture, lazy scope/default timing, representative app/library types, candidate conformance helper. |
| `contracts.mts`                        | Exact-type assertions and expected compiler rejections, additional generic parameters/private state, covariant and incompatible default overrides.  |
| `counterexamples.mts`                  | Compiler-accepted independent-generic erasure, required constructor state, and constructor-specialization behavior. Never execute its functions.    |
| `constructor-counterexamples.mts`      | Narrowed protected constructors that pass the proposed helper; also accepted/rejected extra-state and generic-default examples.                     |
| `examples.spec.mts`                    | Twelve browser examples of the bounded working behavior.                                                                                            |
| `constructor-counterexamples.spec.mts` | Runtime confirmation of the four accepted-but-incompatible constructors.                                                                            |

The compiler uses `strict`, `noEmit`, `NodeNext`, `exactOptionalPropertyTypes`,
`noUncheckedIndexedAccess`, `noImplicitOverride`, and real Playwright types. Library
declarations are checked too (`skipLibCheck` is not enabled). `@ts-expect-error`
directives must correspond to actual diagnostics. Type-only assertions intentionally
do not use `noUnusedLocals`. Negative examples run only where explicitly tested.

## Exact candidate contract

The actual executable declarations in `probe.mts` are authoritative:

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

`Class` is `Function & { prototype: PageObject<UnboundRoot> }`, with no public
construct signature. `UnboundRoot` is `RootReference | null`. The conditional
`Context` accepts a Page only for a nullable root; otherwise it requires a parent
with compatible actual root typing. `TargetArguments` is empty for groups,
optional for DOM instances with a definite string `defaultTarget`, and required
for other ordinary DOM construction.

`rootFixture(Class, ...target)` accepts only instances assignable to their own
declared root type, preserves `Result<C>` in its fixture callback, and supplies
root designation as the third constructor argument before child fields initialize.
Its target is optional for DOM roots (html fallback), absent for groups. Rootless
classes and incompatible app-bound descendants are rejected as fixture roots.

The factory and fixture use internal construction assertions. Consumers need no
casts, public constructors, per-app factory overrides, or empty wrappers. This
does not establish a safe contract for arbitrary constructor overrides.

Targets here are **strings only**, sufficient for the initialization proof. Their
precedence is explicit target, instance default, then html for a designated DOM
root. Resolution is lazy enough for a default field after child declarations and
for subclass defaults affecting inherited children. Target-family expansion,
mutation/caching semantics, naming, and narrowing/reconstruction belong to later
tickets. Prototype click/confirmation methods are illustrative.

## Candidate library-author instructions, pending approval

Each generic library class describes all independent parameters and its bare
default instance type. The parameter object permits descendants to add keys.
The bare instance spelling applies the class's declared defaults rather than
duplicating them in the metadata.

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

// Candidate author obligation: one assertion per generic declaration.
checkLibrary<ValueButton>()(ValueButton);

// Ordinary app authoring stays unchanged.
class AppValueButton extends ValueButton<App, number> {}
```

The helper compares the inferred factory result with the supplied default
instance and makes a coarse protected-constructor compatibility check. It catches
the tested missing/stale parameter/default declarations and some incompatible
required constructor arguments. **Calling it is not compiler-enforced, and its
constructor check is insufficient.** Do not describe it as a complete safeguard.
Own field initializers/private state with inherited constructors are demonstrated;
arbitrary custom initialization contracts are not supported by the proof.

## Verified behavior and limits

| Case                                                                    | Result                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direct `LibraryButton.create(page/parent)`                              | Exactly `LibraryButton<UnboundRoot>`; nominal API and root-dependent methods retained, root is neutral/nullable without any.                                                                                                                   |
| Concrete `AppButton extends LibraryButton<App>`                         | Exact class, definite App root, custom methods and App-returning methods; Page context rejected.                                                                                                                                               |
| Concrete null and App-or-null classes                                   | Their own context/root contracts preserved, including rejection of App parents for null-only classes.                                                                                                                                          |
| Protected construction, conditional targets, groups, self-root fixtures | Positive and expected-negative cases compile; browser identity/default/scoping checks pass.                                                                                                                                                    |
| Private fields and explicitly declared independent parameters           | Exact default instance and method result types; concrete app binding retains independent parameter types.                                                                                                                                      |
| Structurally equivalent generic defaultTarget override                  | Actual runtime constructor and override preserved; exact structural instance equality passes. TypeScript does not give empty subclasses a separate nominal identity.                                                                           |
| Missing metadata with changed root default                              | The factory can still select an ancestor's neutral default. The mandatory candidate helper rejects the class when explicitly called.                                                                                                           |
| New independent parameter with already-fixed root                       | Undeclared parameter erasure leaks any; private-only generic state also cannot be certified by inspecting public members. Explicit parameter metadata plus the helper catches the tested cases.                                                |
| Narrower independent default (string to string literal)                 | Works with fresh metadata and the helper.                                                                                                                                                                                                      |
| Unrelated independent default (string to number)                        | Fresh default metadata fails inherited-property covariance. This encoding does not support it. The rejection is preserved.                                                                                                                     |
| Constructor instantiation `(LibraryButton<App>).create(page)`           | Still returns the neutral metadata default. It does not bind the inherited factory. Concrete subclasses are the demonstrated binding path.                                                                                                     |
| Required custom state/constructor parameter narrowing                   | Factory alone accepts unsafe calls. The helper rejects a required fourth argument but accepts Page-only context, literal-only target, required target despite instance default, and false-only root designation. All four can fail at runtime. |

An alternate constructor-owner metadata experiment detected changed generic
defaults with unchanged constraints. It did not detect independent generics
omitted from the parameter map. Carrying exact protected constructor types in
covariant inherited metadata also rejected some legitimate root constraints.
It was therefore not promoted into this candidate.

## Choice still owed by the author

The examined encodings have not provided automatic TypeScript-only enforcement
for every allowed generic subclass and protected constructor override. This is
a bounded experimental result, not a proof that every encoding is impossible.

Two directions remain concrete:

1. Investigate an enforced authoring rule: every generic library declaration
   supplies its own complete metadata and default-instance conformance check;
   library and app classes retain inherited constructors, using fields for state.
   A lint/source check must demonstrate that omitted declarations and prohibited
   constructors are rejected. Unrelated generic default changes still need a
   representation change or an explicitly accepted limitation. This is a
   proposal, not installed tooling or an approved restriction.
2. Continue exploring another type/API representation before accepting those
   authoring rules. Preserve the existing consumer behavior while investigating;
   bring any necessary public API change back to the author.

Do not silently weaken the ticket to approve only the root-generic happy path.

## Primary language references

- [TypeScript classes: static members and class type parameters](https://www.typescriptlang.org/docs/handbook/2/classes.html#type-parameters-in-static-members).
- [Strict function types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-6.html#strict-function-types): constructor declarations are excluded from strict parameter contravariance, explaining the narrowed-constructor counterexamples.
- [TypeScript issue #30991](https://github.com/microsoft/TypeScript/issues/30991): protected/private constructors and public construct-signature utilities. The current compiler probes establish the specific extraction limitation used here.
