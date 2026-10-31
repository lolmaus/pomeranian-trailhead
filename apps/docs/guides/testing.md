# Chromium testing

Available since @repo/test-support@Unreleased

The private `@repo/test-support/config` workspace export supplies framework-independent Chromium defaults. It is repository development infrastructure, not a consumer dependency or published Pomeranian API. Its [generated reference](../reference/development/variables/testConfig.md) comes from the owning source comment.

<!-- @example examples/inline.spec.mts#configuration -->

A package owns its test directory and optional `webServer`; shared defaults do not couple the runner to React. Chromium is the initial browser. Tiny inline HTML stories are preferred for isolated behavior. Extract large or reused scenarios rather than building a handwritten route registry.

## Focused and full runs

```sh
pnpm --filter @repo/docs exec playwright test examples/inline.spec.mts
pnpm run test
pnpm run test:fresh
```

The focused command uses the docs workspace's server-managed test configuration. The full test command uses Turbo dependency and affected-package conventions. `test:fresh` bypasses the task cache. Reports, traces, and screenshots remain local generated artifacts unless CI uploads them.

Use normal Playwright assertions to verify outcomes independently of a page object's implementation. Avoid asserting the same private state that the operation just wrote. [The inline HTML recipe](../recipes/inline-html.md) gives a complete maintained example.
