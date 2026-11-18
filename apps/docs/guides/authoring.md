# Authoring reusable classes

Available since @pomeranian/core@Unreleased.

Changed in @pomeranian/core@Unreleased: public constructor authoring enables generic capability factories; direct construction remains unsupported.

Core supports public class-factory capabilities through inherited static `.with(...)`. It applies factories left to right, passing each factory the preceding constructor, and returns a genuine subclass without mutating its receiver. Declare a named class extending that result, then use the named class's inherited `create` or `rootFixture`.

Constructors are technically public for TypeScript's ordinary generic class-factory pattern. Direct `new` remains unsupported: it bypasses the existing factory finalization after concrete fields initialize. Inherit constructors, `create` and `with` unchanged. Put custom state, including private fields, in instance initializers. Concrete app subclasses bind root and additional generic arguments once; factories preserve their concrete methods and types.

## Capabilities and dependencies

<!-- @example examples/composition.spec.mts#capabilities -->

`Constructor<Instance>` is the public class-factory authoring helper. Its variadic `any[]` constructor signature is the form TypeScript requires for mixin classes; it does not erase the composed receiver or its exact factory result. Give a capability the narrow usable base features its implementation needs. DOM requirements reject grouping bases that lack those features; they cannot certify the live DOM node, actionability or native action applicability.

Flat lists retain all earlier contributions, including requirements fulfilled by earlier capabilities. A missing or reversed requirement is a compiler error, including late in a larger list. Bundles can call other capability factories to share implementations. For reusable emitted libraries with private state, an explicit public return interface, as in `Counting`, keeps the declaration boundary clear.

Composition uses ordinary JavaScript precedence. It adds no collision check or allow-annotation. Compatible explicit method overrides can forward through `super`; incompatible or accidental contributions need source review beyond constructor intersections. The future optional checker will inspect original contribution signatures and member kinds.

Design custom methods around [complete actions and assertions](../concepts.md#product-contract-complete-actions-and-assertions) that let routine tests use only Pomeranian. Custom assertions belong on page objects and should not require test-side matcher imports or extending Playwright's `expect`. Native reads can support their implementation, but do not add raw-value forwarding methods just to mirror Locator; test authors who deliberately need raw values can use `.locator`. Essential assertion APIs are still planned, so this principle does not establish an implemented assertion helper or final method spelling.

<!-- @example examples/core.spec.mts#authoring -->

Every generic library class declares fresh type-only metadata under `defaultInstanceType`: its bare default instance type and a direct property for every independent generic parameter. Follow it with an unsuppressed `checkLibrary<BareClass>()(BareClass)` conformance check. Keep the metadata and class/helper identity lexically direct. Concrete subclasses that introduce no new independent parameters need no additional metadata.

<!-- @example examples/composition.spec.mts#generic-composition -->

Compose the generic constructor first, then apply the wrapper's type arguments in its heritage clause: `extends DomPageObject.with(Text, Counting, CountLabel)<Root>`. A generic composed wrapper uses `override get root(): Root { return super.root; }` where needed to preserve its declared root exactly. This scoped recipe is library-author boilerplate; ordinary named classes and concrete descendants do not need blanket getter or metadata redeclarations.

`checkLibrary` verifies result/default conformance. TypeScript checks incompatible root contexts, target arguments, capability requirements and exact factory results. It does not prohibit technically public construction. Its constructor comparison is coarse: constructor bivariance, erased generic parameters and structural typing leave unsupported source forms that the compiler can accept.

## Essential action bundles

Available since @pomeranian/lib-essential@Unreleased.

The essential package supplies reusable Locator-based factories and six foundational controls. Use `EditableText` once for fill/clear/appendText rather than stacking it with `EditableValue` or `Fillable`; choose `EditableValue` for fill/clear without append; use `CheckableUncheckable` once for check/uncheck/setChecked. Factories also work above a custom DOM component base. The [essential migration and authoring guide](../api/lib-essential.md#migration-from-universal-element-actions) includes checked generic metadata/root-getter and custom-base examples. Control class names express intent, with native applicability evaluated per action on the live target. Assertions remain independently composable under #28.

## Contributed children and initialization

<!-- @example examples/composition.spec.mts#capability-children -->

Root designation happens before capability fields and contributed children initialize. An inherited child initializer still executes before a compatible subclass field replaces that child. Methods reading `this.Button` see the replacement; a previously captured child stays a different object, with any initializer side effects already performed. Later sibling fields may not exist yet. Do not resolve Locators during this object or an ancestor's initialization.

The completed concrete `defaultTarget` is captured after all fields; an explicit target still wins. Standalone trees retain null roots, and groups forward DOM scope. Internal reconstruction preserves the concrete composed class and replays fresh private state and child initialization in the reconstructed scope. It is core-owned behavior, not a public lifecycle or state-transfer hook.

## Supported authoring restrictions

- Keep inherited constructors, `create` and `with`; do not override protocols, add constructor parameters or change root designation. Never construct through direct `new`.
- Declare complete fresh metadata for every generic class and every independent parameter. Do not silently change inherited generic defaults without new conforming metadata.
- Use named class declarations as factory/fixture receivers. Ordinary generic capability factories and their returned subclass expressions are supported. Do not call computed `Base.with(...).create()` directly: its inferred factory result can lose contributions. Avoid unsafe constructor aliases, extracted factories, namespace merging and unrelated dynamic construction paths.
- Do not use casts, `any`, diagnostic suppressions or index signatures to bypass the contract.

These are documented authoring restrictions, not blanket compiler or runtime guarantees. The optional standalone `@pomeranian/check` source-checking tool is tracked separately and is not delivered by this slice. Ordinary installation, runtime use and consumer CI do not require it. When that tool ships, its documented checked mode will combine strict compiler checks with the additional supported source restrictions. Do not claim unchecked source has those guarantees today.

The core package's `tests/authoring` fixtures retain accepted examples and unsafe-but-compiling counterexamples for the checker work. The historical [factory proof](factory-proof.md) demonstrates only its bounded inventory and its own source rule; that prototype is not a production checker.

## Types and direct imports

The generated [authoring helper context](../reference/authoring-helpers.md) includes source-derived factory type declarations alongside the generated API. The accepted [TypeDoc getter specialization limitation](factory-proof.md#accepted-typedoc-limitation) remains explicit; checked compiler fixtures establish actual specialization.

Use `@pomeranian/core/authoring` for `Constructor`, the metadata symbol, `checkLibrary` and supporting root/factory types. Use defining modules such as `@pomeranian/core/dom-page-object` for direct class imports, and `@pomeranian/core/target` for target types. The package root provides convenience exports of the same identities.

ESM and CommonJS entry points share one runtime and canonical declarations. Included TypeScript sources and source/declaration maps support debugging, but internal source/dist paths are not public package exports. Internal reconstruction, readiness, caching and occurrence data are not extension hooks.
