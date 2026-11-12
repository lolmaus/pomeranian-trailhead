# Multiple Pages, portals and frames

Available since @pomeranian/core@Unreleased.

Keep one page-object tree per Playwright Page. If using rooted trees, create a separate application-root instance for each tab or popup. Roots are per-instance anchors, not global singleton Pages. Coordinate between trees in the test or fixture; a standalone object needs no root wrapper.

<!-- @example examples/core.spec.mts#multiple-pages -->

A popup can be obtained with `page.waitForEvent("popup")` around the action that opens it, then supplied to its own tree's inherited factory. A fixture can similarly supply a separate designated root. A Locator from another tab fails ownership validation even when the tabs share a browser context.

## Global and portaled queries

<!-- @example examples/core.spec.mts#portals -->

The factory's `scope` is the nearest DOM ancestor, forwarded through groups. Use `(scope ?? page)` for scoped queries and `page` deliberately for a global dialog, dropdown or toast. Supplied Locators also retain their own query rather than composing automatically with a structural parent.

## Same-Page frames

<!-- @example examples/core.spec.mts#frames -->

A frame Locator whose public `page()` is the associated Page is accepted. This is a Page ownership guarantee, not a guarantee that every combination of cross-frame queries is valid. Playwright enforces its frame and operation rules. For CSS, `:scope` refers to the inherited DOM scope; explicit sibling selectors may leave its subtree.
