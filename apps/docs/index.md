# Pomeranian

Pomeranian is being built as a typed page object framework for Playwright. Its goal is to make tests read in the language of an application while keeping ordinary class inheritance, composition, and Playwright behavior visible.

For example, a page object can group related UI subjects behind meaningful names. A test can then describe an application action without repeating its DOM structure at every call site. Strong types should preserve the application-root contract when a library class is specialized by a consumer.

::: warning Unreleased development documentation
There is no published Pomeranian consumer package or supported production API in this repository yet. The working code currently consists of private Chromium test infrastructure and a throwaway factory-typing proof. Prototype names and signatures are not promises for the future framework.
:::

Start with [installation and status](installation.md), then [run an isolated Chromium example](getting-started.md). The [concepts](concepts.md) distinguish confirmed design vocabulary from implemented behavior. The [API reference](api/index.md) states the status of each planned package explicitly.

## What works today

- The repository's shared Playwright configuration runs isolated scenarios in real Chromium.
- The factory proof demonstrates inherited protected construction, explicit application-root contracts, and source-enforced library authoring rules.
- This website and its API reference are generated from checked Markdown, maintained examples, and owning source comments.

[Contribute a complete behavior slice](contributing.md): implementation, meaningful checks, applicable source comments, a checked usage example, and documentation belong together.
