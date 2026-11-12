# Construction and DOM targets

Available since @pomeranian/core@Unreleased.

The production core is implemented in this repository and can be built and packed locally. It has not been published to npm. The examples use supported package imports, rather than the historical proofs.

## A small page object

<!-- @example examples/core.spec.mts#construction -->

`DomPageObject` supplies DOM targeting. `PageObject` organizes children without a DOM node. Universal actions and assertions belong to the later essential layer; use the object's native Playwright `locator` for this core slice.

Inherited static `create` delegates to a protected constructor. Declare children as ordinary UpperCamelCase fields using `this` as context. Inherit constructors and factories unchanged, and initialize custom state in fields. See [library authoring](authoring.md) for generic metadata and the boundaries of compiler checks.

## Scope, root and Page

`page` is always the associated Playwright Page. A DOM object's `locator` is always a Locator. Its scope is the nearest DOM ancestor's effective Locator, forwarded through any grouping objects. There is no public parent accessor.

An application root is an explicit fixture designation, not the absence of a parent. `rootFixture(App)` designates the app before child fields initialize. The app returns itself from `root`; descendants return that same instance. Standalone objects created from Page have a null root throughout their tree. Application-bound classes extend `DomPageObject<App>` or `PageObject<App>`; reusable root-independent classes use the neutral default. Use `App | null` deliberately when one class supports both modes, and handle the null case in methods.

Root identity is available early, but later sibling fields may not exist yet. Do not resolve Locators during the object's own initialization or while any ancestor is still initializing. Such access throws even for an otherwise safe supplied Locator. After successful construction the same child can be used normally.

## Fixed targets and precedence

An explicit target wins over the completed instance's `defaultTarget`. `undefined` means omitted. Only a designated DOM app root falls back to `html`; ordinary DOM objects must supply a target or a definite default. Groups accept no target. An invalid explicit value throws instead of falling back.

Defaults may be strings, Locators or synchronous factories. A subclass's completed default scopes inherited and ordinary child fields, even when the child is declared before that default. Own target capture never resolves ancestors or invokes a factory. The selected target is fixed after construction; changing a field later does not retarget the object.

## Three target forms

- **CSS string:** one Playwright CSS body, optionally beginning with `css=`. Compose through the inherited Locator operation. Selector lists, Playwright CSS extensions, open shadow DOM, `:scope`, relative children and siblings retain native semantics. Scope is not containment: an explicit sibling selector may leave the ancestor's subtree.
- **Locator:** retain its identity and query, without composing the parent scope. Same-Page frame Locators are allowed. Locators from another Page are rejected through public `locator.page()` ownership checks.
- **LocatorFactory:** `(context: Readonly<{ page: Page; scope: Locator | null }>) => Locator`. Use `(scope ?? page)` for ordinary scoped queries; deliberately use `page` for portals or global subjects. No DOM ancestor means null scope. Factories receive no parent page object.

Strings reject non-CSS engines and engine chains. Quoted or escaped `>>` text is allowed. Use a supplied Locator or a factory for other native query APIs; there is no separate unscoped-string syntax. Full CSS grammar, DOM existence, cardinality and frame-operation constraints remain Playwright's responsibility when an operation evaluates the query.

## Lazy resolution, caching and retries

The first valid `.locator` access resolves the query and memoizes only a successfully validated Locator. This retains Playwright's live DOM lookup: it caches the query, not matched nodes. Zero matches are valid, and operations decide whether one or many matches are allowed.

Factories must be synchronous and side-effect-free; a Promise, Page, FrameLocator or other invalid result is rejected. A throwing factory, invalid result, wrong-Page result, initialization failure or cyclic resolution does not poison the cache. A later access can retry. Cycles produce an explicit error instead of unbounded recursion.

[Standalone Playwright](../recipes/standalone.md) needs no runner or root wrapper. [Multiple Pages, portals and frames](../recipes/multiple-pages.md) shows deliberate global queries and independent app roots. Public narrowing operations, selector setup and Page configuration are separate upcoming slices; no custom engine registration is needed for this native-only core.
