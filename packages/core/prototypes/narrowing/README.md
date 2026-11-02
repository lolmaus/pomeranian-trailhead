# Throwaway narrowing/reconstruction proof (#11)

This experiment tests the developing decision in
[typed narrowing and instance reconstruction (#11)](https://github.com/lolmaus/pomeranian-trailhead/issues/11).
It is not production core, has no package manifest or exports, and settles no
additional public API until the author confirms the complete contract.

Run with installed workspace dependencies and Chromium:

```sh
node packages/core/prototypes/narrowing/run.mjs
```

`--types-only` omits Chromium. The runner installs nothing, copies sources to
temporary storage, and retains failures for inspection. Factory and target
machinery is borrowed from the separately bounded #9/#10 proofs. This experiment
does not replace or broaden #9's authoring-source enforcement.

The agreed starting point is a new concrete instance with a derived target,
ordinary field/private-state initialization, fresh children, and the initial
first/last/nth/filter surface. Convenience APIs have their own decision (#19).

## Candidate contract demonstrated

The operations live on `DomPageObject`; a future `Element` subclass inherits them.
Grouping objects do not acquire DOM narrowing. The proposed declarations follow
Playwright's method spellings and options, returning polymorphic `this`:

```ts
first(): this;
last(): this;
nth(index: number): this;
filter(options?: Parameters<Locator["filter"]>[0]): this;
```

The proof delegates the native filter fields `has`, `hasNot`, `hasText`,
`hasNotText`, and `visible`. Containment criteria accept raw Locators with
Playwright's relative-query and same-frame requirements. There is no page-object
argument overload, selector/class/test-attribute convenience, or arbitrary
query-transform extension API in this starting surface. Authors can compose it:

```ts
byText(text: string): this {
  return this.filter({ hasText: text });
}
```

### Fresh construction with a derived query

- Capture the actual runtime class through `new.target`, not the mutable instance
  `constructor` property. Reinvoke it with the original construction context and
  designation, replacing only the target. One common path handles every object;
  there is no root-specific narrowing branch or restriction.
- Ordinary initializers run again, including inherited declarations, arrow
  functions, private fields, and child factories. Custom state is neither copied
  nor shared automatically. Field side effects also run again, so authors remain
  responsible for their initialization behavior. #9's inherited-constructor and
  metadata/source-check restrictions remain unchanged.
- Preserve concrete instance methods, declared generic bindings, Page, and normal
  root construction rules. Ordinary descendants keep their associated app; a
  designated root constructed again retains its designation under the same rules.
  The original instance, its fields, children, target, and root remain unchanged.
- Derived objects have the source's structural parent, not the source as a new
  scoping parent. Fresh children instead have the new derived object as parent.
  Strings/scoped factories consume its narrowed scope; explicit supplied Locators
  and global/Page-based factories keep their deliberate queries.
- Derive from the source's fixed effective query, not by rerunning its default
  target against newly initialized custom fields. Chaining applies operations in
  call order and never broadens back to the original default.

### Timing and errors

Reconstruction captures a lazy target callback; it does not resolve a Locator,
invoke a target factory, wait for elements, or fix a DOM snapshot. Each object
memoizes only its successfully validated Locator. Source query resolution uses
the source's normal cache; this shares query lineage, not child instances or the
derived object's own cache. Factories, readiness, ownership, and retry guards keep
the #10 behavior. DOM changes remain visible to later operations.

Capture filter options and text/RegExp values at the narrowing call so subsequent
caller mutation does not alter the chosen filter. Locator arguments remain
Locators, and factory closure values retain #10's first-resolution semantics.
Native operation outcomes and frame restrictions remain Playwright's responsibility;
do not add stronger index/cardinality/containment promises.

An object cannot derive itself before its own construction completes, preventing
recursive field initialization. A completed child can be narrowed in its parent's
field declaration while that parent is still initializing: this does not resolve
any queries. Explicit Locator access still rejects any initializing ancestor and
remains retryable afterward.

### Occurrence information, not a reporting API

The proof keeps structural parentage separate from derivation lineage. Each
derivation records its source occurrence plus operation and captured arguments;
chains retain their order. Fresh children point to their actual new parent.
This is sufficient input for later occurrence naming without fixing name
inference, formatting, or report instrumentation here.

`inspectOccurrenceForProof` exposes a diagnostic view solely to exercise this
seam. The parent view, operation records, and serialized RegExp descriptions are
read-only/frozen; actual Locator arguments remain opaque query references.
This function is not a proposed public parent accessor or production export.
Reconstruction uses a module-private symbol, not a protected user override.
The borrowed public construction/validation helpers are also prototype internals;
production must hide/enforce its lifecycle and validate the full authoring source
set rather than treating this proof as shipped source enforcement.

## Evidence

The strict compiler checks exact concrete/default results, additional generic
parameters and return values, App/null/nullable roots, custom fluent methods, and
rejections of invalid options/contexts, group narrowing, and public construction.
Thirteen real Chromium cases exercise fresh state and classes, nested repeated
components/groups, mixed targets, inherited defaults/methods, live queries,
composition, argument capture, initialization, retry/ownership, native filtering,
ordinary root designation, and ordered occurrence/derivation data.

The runner always performs its own strict compiler check; ordinary workspace
lint/type/test commands do not automatically include this standalone directory.
No changes to production packages, normal task discovery, dependencies, releases,
or generated documentation are made by the proof.

Primary references: [Locator methods](https://playwright.dev/docs/api/class-locator)
and [filtering semantics](https://playwright.dev/docs/locators#filtering-locators).
