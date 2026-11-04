# THROWAWAY #19: convenience decision proof

This independent proof borrows the #11 reconstruction, factory types, successful-only
Locator cache, readiness/cycle/ownership guards, and internal occurrence machinery.
It is evidence for an API decision, not a production package or approved integration.
It changes no earlier prototype and installs no dependencies.

The author confirmed the [complete convenience contract](https://github.com/lolmaus/pomeranian-trailhead/issues/19#issuecomment-6632430518)
and its implementation split. Production work is tracked in
[class/attribute conveniences (#21)](https://github.com/lolmaus/pomeranian-trailhead/issues/21),
[general matching (#22)](https://github.com/lolmaus/pomeranian-trailhead/issues/22),
[configured test-ID/role narrowing (#23)](https://github.com/lolmaus/pomeranian-trailhead/issues/23),
and [text/visibility shortcuts (#24)](https://github.com/lolmaus/pomeranian-trailhead/issues/24).
The [packaging/compatibility decision (#17)](https://github.com/lolmaus/pomeranian-trailhead/issues/17)
must choose production registration and adapter delivery before those builds.
The [checked review ledger](https://github.com/lolmaus/pomeranian-trailhead/issues/19#issuecomment-6632309101)
records both fixed findings and all 26 passing Chromium cases.

Run from any directory:

```sh
node /absolute/path/to/repo/packages/core/prototypes/conveniences/run.mjs
node /absolute/path/to/repo/packages/core/prototypes/conveniences/run.mjs --types-only
```

The runner copies this directory's selected sources into a temporary directory,
links the existing test-support dependencies, performs strict TypeScript checking,
and runs real Chromium. Successful runs remove their scratch directory; failed runs
print a retained scratch path containing reports. Dependencies used here are
Playwright 1.64.1, TypeScript 7.0.2 and the already installed Chromium. Sandbox hosts
may need elevated execution permission for Chromium.

## Evidence and semantics

Every convenience derives a fresh actual concrete instance through the borrowed
constructor route. Ordinary/private fields and children initialize again. Operations
retain polymorphic `this`, supported bound root/generic APIs and source lineage.
The internal diagnostic seam records the underlying public operation and captured
criteria, including application composition such as `onSale() -> withClass('sale')`.
There is no custom-name interception or public reporting API.

`withClass`, `withoutClass`, and `withAnyClass` implement all/none/any exact
case-sensitive `classList` token membership. All require one or more nonempty
string tokens with no ASCII class whitespace, without trimming, splitting or
coercion. The proof includes quotes, backslashes, punctuation and nonbreaking space.
`withAttribute`/`withoutAttribute` implement raw presence or whole case-sensitive
string/regex value conditions. Negative value conditions include absent attributes.
No browser property reflection or CSS attribute case-folding is involved.

`withTestId`/`withoutTestId` capture the configured attribute and regex source/flags
at the call, while leaving source resolution lazy. Text operations use native
`filter({hasText/hasNotText})`; visibility uses native `filter({visible})`. They
retain Playwright's whitespace, descendant text, substring and visibility semantics.
Own role filtering snapshots a native `getByRole` query at the call and applies
an isolated private `internal:and` candidate at the source's frame query root,
including implicit roles, native full options, separate ARIA hidden rules, and
captured inherited getter options (including both regex fields).

CSS `matching` validates the same single-CSS-body target boundary as #11. It uses
Playwright's native CSS evaluator with `:scope:is(branch)` for ordinary selector
list branches, intersecting the result with the source. A bounded scanner splits
top-level commas while preserving quoted/escaped commas, functions, attributes and
comments; native Playwright still parses the CSS. Thus `.active` and `:scope.active`
inspect each source itself,
including nested source elements. CSS lists, shadow piercing and `:has-text` are
exercised; this is not browser `Element.matches` or string concatenation onto the
original target selector. Leading `>`, `+`, or `~` on each list branch keeps native
relative selection, then intersects with the original source. Mixed ordinary/relative
lists preserve both branches regardless of their order. Consequently `> .active` may keep a
nested source element and `+ .item` may keep a source sibling. Neither becomes
`:has`, and neither introduces an element absent from the source query. A factory
receives the nonnull source Locator and retains normal Locator selection semantics.
No `notMatching` is implemented.

Same-frame direct Locators, single-hop and nested FrameLocator sources, and open shadow roots
are exercised. Source-derived native CSS/role intersections work in those cases.
Opaque Locators must satisfy native same-Page and same-Frame composition rules;
the proof preserves native cross-frame rejection. This is not a promise that all
nested frame traversal shapes or every CSS dialect combination compose. Invalid
CSS grammar remains Playwright's error at evaluation, as in #11.

## Explicit integration choices still owed

- A public globally registered `proofself19` selector engine returns the source
  element for class/attribute predicates (`Element[]`, never a `Document`).
  Production engine naming, registration lifecycle, worker ownership, browser
  compatibility and supported Playwright versions belong to later build decisions.
- **Test-ID attribute capture and role filtering use private `Locator._selector`.**
  Shared isolated code requires exactly `@playwright/test` 1.64.1 at runtime and
  validates native engine prefixes/shapes. A native sentinel `page.getByTestId`
  query supplies the configured attribute through its `internal:testid=[attribute=...]`
  encoding. The bounded decoder accepts literal native identifier names, quoted
  names, and comma-separated configured name lists; it captures the complete list
  and tests any matching attribute. Unsupported/malformed encodings fail at the
  call boundary rather than being truncated or silently reinterpreted. A native
  `page.getByRole` query supplies the complete native role
  predicate, including escaped criteria/options. The role adapter appends it as
  `internal:and=JSON.stringify(predicate)` to the source Locator, preserving its
  original root/frame context. This uses private query encoding and engine syntax,
  and does not import Playwright's private parser. The earlier public document-root
  engine candidate omitted html's own role (expected 1, observed 0); the final
  private candidate passes html, shadow, single and nested frame examples.
  These dependencies are candidate evidence only: no permission to ship them, no
  compatibility range, and no project-wide private-API policy is implied. Ticket
  #17 must settle compatibility and the production adapter policy. The author
  confirmed this boundary with the semantic API and implementation work split.
- `withoutClass`/`withAnyClass` and their shared strict token policy were confirmed
  with the complete contract. No general `notMatching` or custom naming hook is
  selected.
- The copied #11 factory/source-authoring proof limitations still apply. This
  experiment does not implement source lint enforcement or production exports.

The tests use literal expected DOM results and real inline HTML. The copied #11
cases cover reconstruction, initialization, root binding, lazy retries and source
query identity. New #19 cases cover convenience self-selection, absence, exactness,
escaping, mutation/getter capture, native semantics, scopes/relative CSS, lineage,
fresh children, factories, frame compatibility and strict type rejection.

Process limitation: several initial convenience implementations were grouped after
the first failing seam rather than developed through strict one-operation-at-a-time
RED/GREEN cycles. Subsequent review regressions follow test-first repair. Passing
tests and review findings establish bounded behavior evidence, not a claim that the
initial implementation followed the project's complete TDD process.
