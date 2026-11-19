# DOM narrowing

Added in @pomeranian/core@Unreleased. `DomPageObject` and essential controls inherit `first()`, `last()`, `nth(index)` and `filter(options?)`. Each returns a fresh instance of the same concrete class with the exact root and generic types. Grouping `PageObject` objects have no narrowing surface.

<!-- @example examples/narrowing.spec.mts#narrowing -->

Operations compose in call order. `Rows.first().filter({ hasText: "Ready" })` filters only the first row; filtering before `first()` selects the first matching row. Native zero-match/out-of-range queries remain valid. `nth(-1)` selects the last match.

Construction reruns instance fields, private state, and child declarations. Accumulated custom state is not copied. New string/scoped-factory children follow their new parent's narrowed query through groups. Explicit Locators and deliberately Page-based factories retain their queries. Defaults are captured on the source and are not recaptured from reset state. Constructors and inherited factories follow the [authoring contract](./authoring.md).

Narrowing does not resolve Locators or inspect DOM matches. Queries stay live; successful Locator resolution is cached per instance, while failed target factories/ownership checks remain retryable. Calling narrowing on an object still initializing fails; a completed child can be narrowed during ancestor field initialization, but Locator access waits until all ancestors finish.

Native `filter` supports `has`, `hasNot`, `hasText`, `hasNotText`, and `visible`. Supported properties, including inherited getters, are read once at the call. RegExp contents are copied. Later caller changes do not alter the query. Containment arguments are raw relative Locators, never page objects; Playwright's same-frame restrictions apply. Omitted options retain every match.

A designated root reconstructs as a fresh root with fresh root-aware descendants. App-bound descendants retain their original app reference; standalone trees keep null roots. A custom fluent helper can return `this` by returning a public narrowing operation. Field initialization side effects and state reset remain the author's responsibility.

Class/text/attribute convenience helpers and occurrence naming/report instrumentation remain separate work. There is no public diagnostic or state-transfer accessor.
