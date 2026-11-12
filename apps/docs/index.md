# Pomeranian

Pomeranian is being built as a typed page object framework for Playwright. Its goal is to make tests read in the language of an application while keeping ordinary class inheritance, composition, and Playwright behavior visible.

Routine tests should use only Pomeranian page objects, expressing complete actions and assertions in application vocabulary. Raw-value reads and arbitrary low-level logic remain available through `.locator`; they are deliberate escape hatches rather than the intended routine test style. See the [foundational API contract](concepts.md#product-contract-complete-actions-and-assertions).

For example, a page object can group related UI subjects behind meaningful names. A test can then describe an application action without repeating its DOM structure at every call site. Strong types should preserve the application-root contract when a library class is specialized by a consumer.

::: warning Unreleased development documentation
There is no published Pomeranian consumer package yet. The production core construction and DOM-target API is implemented and locally packable, with checked examples and generated reference. Essential actions/assertions, public narrowing and selector setup remain separate work. Historical proofs are labelled explicitly.
:::

Start with [installation and status](installation.md), then [run an isolated Chromium example](getting-started.md). The [concepts](concepts.md) distinguish confirmed design vocabulary from implemented behavior. The [API reference](api/index.md) states the status of each planned package explicitly.

## What works today

- The repository's shared Playwright configuration runs isolated scenarios in real Chromium.
- Production core supports typed inherited construction, root/group/standalone context, and lazy CSS/Locator/factory targets.
- Both Playwright Test and standalone Playwright work with aligned consumer-supplied peers.
- The historical factory proof demonstrates only its bounded source-enforced authoring rules.
- This website and its API reference are generated from checked Markdown, maintained examples, and owning source comments.

[Contribute a complete behavior slice](contributing.md): implementation, meaningful checks, applicable source comments, a checked usage example, and documentation belong together.
