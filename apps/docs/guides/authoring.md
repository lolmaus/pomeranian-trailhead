# Authoring reusable classes

Available since @pomeranian/core@Unreleased.

Consumer classes inherit protected constructors and static `create` unchanged. Put custom state, including private fields, in instance initializers. Concrete app subclasses bind a root and additional generic arguments once; factories preserve their concrete methods and types.

Design custom methods around [complete actions and assertions](../concepts.md#product-contract-complete-actions-and-assertions) that let routine tests use only Pomeranian. Custom assertions belong on page objects and should not require test-side matcher imports or extending Playwright's `expect`. Native reads can support their implementation, but do not add raw-value forwarding methods just to mirror Locator; test authors who deliberately need raw values can use `.locator`. Essential assertion APIs are still planned, so this principle does not establish an implemented assertion helper or final method spelling.

<!-- @example examples/core.spec.mts#authoring -->

Every generic library class declares fresh type-only metadata under `defaultInstanceType`: its bare default instance type and a direct property for every independent generic parameter. Follow it with an unsuppressed `checkLibrary<BareClass>()(BareClass)` conformance check. Keep the metadata and class/helper identity lexically direct. Concrete subclasses that introduce no new independent parameters need no additional metadata.

`checkLibrary` verifies result/default conformance. TypeScript protects ordinary direct construction, incompatible root contexts, target arguments and checked factory results. Its constructor comparison is coarse: constructor bivariance, erased generic parameters and structural typing leave unsupported source forms that the compiler can accept.

## Supported authoring restrictions

- Keep inherited constructors and `create`; do not override or add constructor parameters or change root designation.
- Declare complete fresh metadata for every generic class and every independent parameter. Do not silently change inherited generic defaults without new conforming metadata.
- Use direct class identifiers as factory/fixture receivers. Avoid constructor aliases, extracted factories, mixins, class expressions, nested declarations, namespace merging and constructor-instantiation expressions as authoring paths.
- Do not use casts, `any`, diagnostic suppressions or index signatures to bypass the contract.

These are documented authoring restrictions, not blanket compiler or runtime guarantees. The optional standalone `@pomeranian/check` source-checking tool is tracked separately and is not delivered by this slice. Ordinary installation, runtime use and consumer CI do not require it. When that tool ships, its documented checked mode will combine strict compiler checks with the additional supported source restrictions. Do not claim unchecked source has those guarantees today.

The core package's `tests/authoring` fixtures retain accepted examples and unsafe-but-compiling counterexamples for the checker work. The historical [factory proof](factory-proof.md) demonstrates only its bounded inventory and its own source rule; that prototype is not a production checker.

## Types and direct imports

The generated [authoring helper context](../reference/authoring-helpers.md) includes source-derived factory type declarations alongside the generated API. The accepted [TypeDoc getter specialization limitation](factory-proof.md#accepted-typedoc-limitation) remains explicit; checked compiler fixtures establish actual specialization.

Use `@pomeranian/core/authoring` for the metadata symbol, `checkLibrary` and supporting root/factory types. Use defining modules such as `@pomeranian/core/dom-page-object` for direct class imports, and `@pomeranian/core/target` for target types. The package root provides convenience exports of the same identities.

ESM and CommonJS entry points share one runtime and canonical declarations. Included TypeScript sources and source/declaration maps support debugging, but internal source/dist paths are not public package exports. Internal reconstruction, readiness, caching and occurrence data are not extension hooks.
