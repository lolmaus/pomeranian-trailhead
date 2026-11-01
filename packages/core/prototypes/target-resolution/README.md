# Throwaway DOM target-resolution proof (#10)

This directory exercises the target and scope contract discussed in
[Define DOM target resolution and scope semantics (#10)](https://github.com/lolmaus/pomeranian-trailhead/issues/10).
It is decision evidence, **not production `@pomeranian/core`**. There is no package
manifest, public export, integration, or release. The author confirmed the complete
contract on ticket #10; production implementation remains separate work.

Run from the repository root with the existing workspace dependencies and Chromium:

```sh
node packages/core/prototypes/target-resolution/run.mjs
```

Add `--types-only` for the strict compiler evidence, or forward Playwright options
such as `--grep`. The runner copies sources to a temporary directory, links the
installed test-support dependencies, and installs nothing. Successful runs remove
their scratch directories; failures retain them and print their paths.

## Target and factory inputs

The exact declarations are in `probe.mts`:

```ts
type LocatorFactoryContext = Readonly<{
  page: Page;
  scope: Locator | null;
}>;
type LocatorFactory = (context: LocatorFactoryContext) => Locator;
type Target = string | Locator | LocatorFactory;
```

- Strings use Playwright's CSS dialect, with optional `css=` spelling. Resolve them
  through `(inheritedScope ?? page).locator(cssSelector)`, not selector-text
  concatenation. Preserve selector lists, extensions, open-shadow behavior, explicit
  `:scope`, and relative child/sibling semantics. Explicit sibling selectors can
  leave the parent's subtree; scope is not a containment guarantee.
- Strings contain one CSS body. Other engines and engine chains require a supplied
  Locator or factory. The boundary scanner honors quotes and backslash escapes, so
  text such as `button:has-text("Go >> now")` is valid. It does not implement the
  complete CSS grammar or import Playwright's private parser.
- Supplied Locators remain the same objects, without automatic parent composition.
- A factory receives the associated Page and effective inherited DOM Locator, or
  null when there is no DOM ancestor. Groups forward that scope without fabricating
  an html target. Scoped factories use `(scope ?? page)`; global/portaled factories
  deliberately use `page`. Factories return a Locator synchronously, not a Promise.
- Both supplied and returned Locators must belong to the associated Page according
  to the public `locator.page()` method. Same-Page frame Locators are permitted;
  Page and FrameLocator objects themselves are not Target inputs.

## Construction and resolution

1. The inherited factory delegates to protected constructors. Root designation and
   identity are available before child fields initialize, as in the foundation.
2. After each object's complete constructor/field chain returns, capture its own
   selected target: explicit input, otherwise instance default, otherwise html only
   for a designated DOM application root. Undefined means omitted; invalid explicit
   values do not silently select a fallback. Non-root DOM objects need a target;
   groups do not accept one.
3. Capturing the own target does not read ancestor Locators/defaults or invoke target
   factories. Late parent and subclass defaults can therefore scope ordinary children.
4. Explicit `.locator` access fails while the object or any ancestor is initializing,
   including accesses that could otherwise safely return a supplied Locator.
5. First valid access resolves and validates a Locator, then memoizes it. Later
   accesses retain the same Locator identity and Playwright's live DOM behavior.
6. A throwing factory, invalid result, ownership mismatch, or premature access does
   not poison the object. Retry on the next access, caching successful results only.
   A cyclic factory query receives a clear error rather than overflowing the stack.

There is no retargeting API. The default declaration is read-only on the base type;
the captured target remains unchanged even if an author bypasses that intent by
assigning a mutable subclass field. JavaScript closures are not frozen: factories
read captured values at first resolution, and failed attempts can run again. Build
queries from stable configuration and avoid factory side effects.

No DOM existence, cardinality, or full CSS-grammar check runs merely to construct a
Locator. Zero matches are valid. For example, malformed CSS can produce a memoized
Locator and fail only when Playwright evaluates it. That operation error is distinct
from failing to produce/validate a Locator during resolution.

## Narrowed-parent input seam

One probe constructs a fresh object with an existing parent's `.nth(1)` Locator as
its explicit target. Its fresh string/scoped-factory children use that narrowed
scope; global factories and supplied child Locators remain explicit. The source
object and children keep their own queries and caches.

This tests an input seam only. It does not define or prove a public narrowing API,
same-class reconstruction, custom-state policy, root derivation, or reporting
identity. Those belong to [typed narrowing and reconstruction (#11)](https://github.com/lolmaus/pomeranian-trailhead/issues/11).

## Multiple-Page advanced recipe requirement

Maintain a separate tree for each Page, with a separate application-root instance
when using rooted trees. Coordinate the trees from the test or fixture. The browser
probe constructs the same App class for two Pages and independently checks each
root, Page, and button query. Standalone use still needs no application-root wrapper.

Carry this example into the advanced documentation recipes with the production
slice. Same-Page validation does not mean one global Page, one global root, or a
ban on iframe Locators from the same Page.

## Evidence and limits

- `contracts.mts` checks all three input forms and defaults, nullable factory scope,
  read-only named inputs, exact default/concrete factory results, app-bound context,
  protected construction, and rejected async/string-returning factories, Page,
  FrameLocator, null, absent required targets, and group target arguments.
- `examples.spec.mts` contains real Chromium cases with inline HTML. No Storybook or
  web server is required. It covers the resolution lifecycle, scope boundaries,
  mixed target/default forms, validation/retry behavior, and future narrowing input.
- The factory typing mechanism is adapted from the separately bounded
  [factory-authoring proof](../factory-typing/README.md). This experiment does not
  broaden its supported authoring contract or rerun/extend that proof's source
  enforcement inventory. Compiler evidence here does not replace that enforcement.
- `finishConstruction`, `validateOwnTarget`, `effectiveTarget`, and the private
  state layout are prototype machinery, not approved public extension APIs.
  Production must make lifecycle hooks/internal state appropriately inaccessible,
  retain equivalent authoring enforcement, and integrate package tests/docs.
- Runtime Locator checks use public method shape and Page identity, without a
  private Playwright class brand or frame/selector fields. Full CSS parsing and DOM
  operations remain delegated to Playwright.

Primary references: [locators](https://playwright.dev/docs/locators),
[CSS dialect and selector engines](https://playwright.dev/docs/other-locators),
and [Locator.page()](https://playwright.dev/docs/api/class-locator#locator-page).
