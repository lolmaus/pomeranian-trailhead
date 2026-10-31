# Pomeranian

A TypeScript page object framework for Playwright, currently under development.
The planned public packages are `@pomeranian/core` and `@pomeranian/lib-essential`.
This repository currently contains the development scaffold and a private testing
harness. Public page object APIs and publication are not implemented yet.

Product requirements and decisions live in the [project map (#2)](https://github.com/lolmaus/pomeranian-trailhead/issues/2).
The [testing contract (#3)](https://github.com/lolmaus/pomeranian-trailhead/issues/3)
defines the workflow below. The shared React Storybook hosts package-owned
scenarios, while typed story navigation keeps browser UI out of Node test execution.

## Setup

Use Node **26.12.1** (also recorded in `.nvmrc`) and pnpm **12.15.0**
(the `packageManager` field in `package.json`). Install that pnpm version through
your usual package-manager setup, then run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm run test:install
pnpm run check
```

`test:install` installs **Chromium only** using the CLI from the exactly pinned
`@playwright/test` dependency in `@repo/test-support`. Playwright **1.64.1** and its
bundled Chromium revision stay aligned through the lockfile. After a Playwright
upgrade, rerun this command. On a fresh Linux machine, install system libraries too:

```sh
pnpm run test:install --with-deps
```

Pomeranian and test code run in Node. Browser scenarios use real Chromium, without
DOM emulators. Ordinary Node-only Playwright tests do not launch a browser unless
they request a browser-backed fixture. There is no separate Node test runner.

## Focused development

Use small red/green/refactor loops: introduce one intended failing behavior, run it
and confirm the actual failure, implement the minimum to green, then refactor.
Avoid writing a complete speculative feature suite before its implementation.

```sh
# Every package with a test script, through Turborepo:
pnpm run test

# One package, through Turborepo:
pnpm run test --filter=@repo/test-support

# Direct package invocation preserves every Playwright CLI option:
pnpm --filter @repo/test-support run test browser.spec.mts
pnpm --filter @repo/test-support run test browser.spec.mts:3
pnpm --filter @repo/test-support run test browser.spec.mts -g "inline HTML click"

# Forward a file/title selection through Turborepo:
pnpm run test --filter=@repo/test-support -- browser.spec.mts -g "inline HTML click"

# Run a state-isolation scenario on its own:
pnpm --filter @repo/test-support run test isolation.spec.mts -g "second scenario"

# Explicit fresh test run:
pnpm run test:fresh --filter=@repo/test-support

# Explicit full-workspace verification:
pnpm run check
```

Test tasks have caching disabled, so `test` and `test:fresh` both execute tests
again. Each test receives a new browser context/page through Playwright's lazy
fixtures. A fresh run does not reinstall Chromium. `check` runs lint, real
TypeScript checking, formatting, and all tests. Playwright transpilation alone is
not type checking. Existing pre-commit lint/format/typecheck hooks stay in place;
browser tests run explicitly and in CI.

### Inspecting failures

```sh
pnpm --filter @repo/test-support run test browser.spec.mts --headed
pnpm --filter @repo/test-support run test browser.spec.mts --debug
pnpm --filter @repo/test-support run test --ui
pnpm --filter @repo/test-support exec playwright show-report
```

Headed/debug/UI modes need a graphical session. Normal runs are headless.
The console shows assertion failures and attachment paths. Each package writes
its own `playwright-report/` and `test-results/`, both gitignored. Failed runs retain
traces and screenshots; reports never open automatically. Open a trace with
`pnpm --filter @repo/test-support exec playwright show-trace <trace.zip>` using the
path printed by the failure. CI uploads report/result directories for seven days,
including after test failures. Reports and screenshots describe the tested page,
so keep secrets out of test scenarios.

## Package conventions

`packages/test-support` is private shared infrastructure. It exports
`@repo/test-support/config`, independent of frontend frameworks. Package-local
tests and configuration belong to their owning package.

A new test package declares explicit workspace development dependencies on
`@repo/test-support` and `@repo/typescript-config`, plus the same exactly pinned
`@playwright/test` version as test support. Declare `@repo/oxlint-config` when using
the shared lint configuration. These edges let Turbo select affected consumers
when shared infrastructure changes. Keep runtime dependencies separate from test
tooling; consumers of future public packages must not need React or Storybook.

```ts
// playwright.config.mts in the owning package
import { defineConfig } from "@playwright/test";
import { testConfig } from "@repo/test-support/config";

export default defineConfig(testConfig, {
  testDir: "./tests",
});
```

Use a package `test` script of `playwright test` and real `typecheck`/`lint` scripts.
Extend `@repo/typescript-config/tsconfig.playwright.json` in its test tsconfig and
include test and configuration files. Its DOM declarations describe browser
callbacks and Playwright's types; they do not change the Node runtime.

Tiny framework-independent stories stay inline:

```ts
import { expect, test } from "@playwright/test";

test("click increments a counter", async ({ page }) => {
  await page.setContent(`
    <button data-clicks="0" onclick="this.dataset.clicks++">Click me</button>
  `);
  await page.getByRole("button").click();
  await expect(page.getByRole("button")).toHaveAttribute("data-clicks", "1");
});
```

Inline HTML needs no story server. Keep state behavior ordinary within a test;
never depend on another test's state. Large/shared scenarios live in colocated TSX
story files served through the maintained React Storybook. React, Storybook, and
Ant Design are development dependencies of the fixture workspaces; they are not
runtime dependencies of a published Pomeranian toolkit. The Ant Design fixture
workspace is private and makes no production coverage or compatibility promise.

The [story authoring guide](apps/docs/guides/testing.md) explains manual browsing,
compiler-checked selection, browser readiness, server lifecycle, and debugging.

```sh
# Browse package-owned React scenarios without running tests (port 6006):
pnpm run storybook

# Auto-start the required host and run extracted HTML-as-TSX checks (port 6007):
pnpm --filter @repo/test-support run test:stories

# Run a selected real Ant Design scenario (port 6008):
pnpm --filter @repo/ant-design-fixtures run test button.spec.mts -g "dialog"

# Force a new host; the requested port must be free:
STORYBOOK_FRESH=1 pnpm --filter @repo/test-support run test:stories
```

Local hosted runs can reuse an identity-checked host from this checkout. CI and
`STORYBOOK_FRESH=1` disable reuse. Independent suite ports avoid collisions between
separately launched tests; override them with `STORYBOOK_SUPPORT_PORT` and
`STORYBOOK_ANTD_PORT`. Direct inline commands above remain server-free. Root
`test` includes both inline and hosted tests and the Storybook production-build
check. `test:fresh` forces task execution; use `STORYBOOK_FRESH=1` as well when
you need a fresh server. Normal Playwright file/title/debug/UI flags apply to the
owning package's configuration. Full test and CI routes run one workspace task at
a time to bound memory while Storybook, Chromium, and documentation compilers are
active. Each suite retains its own Playwright worker settings.

These bootstrap scenarios validate the harness, not future Pomeranian page-object
features. Add feature, type, and report-semantic tests incrementally with the
behavior they specify. Preserve relevant guides and source documentation as
features arrive; the documentation workflow below checks them alongside code.

## Documentation

The VitePress app in `apps/docs` publishes development documentation with explicit
production-package status and prototype boundaries. It uses the default theme;
visual design, AI text export, and deployment remain separate work.

```sh
pnpm run docs:dev      # Live guide/example/API regeneration
pnpm run docs:build    # Static artifact and shared content/symbol model
pnpm run docs:preview  # Serve the existing built artifact
pnpm run docs:check    # Full compiler/content/API/link/example/browser validation
```

Author Markdown in `apps/docs` and API comments in their owning packages. The
[authoring guide](apps/docs/guides/documentation.md) defines supported text-first
content, checked excerpt inclusion, package-qualified availability/change history,
and real workspace API registration. Generated reference, indexes, staging, and
HTML stay ignored under `apps/docs/.generated`. The shared content/reflection
model is the input for the next AI-output ticket; no parallel authored corpus is
maintained. TypeDoc's supported TypeScript 6 dependency is local to docs tooling;
project and maintained-example checks remain on TypeScript 7.

The existing non-workspace factory proof is an explicit global Turbo input, so its
changes conservatively select docs and invalidate reference/context generation.
Real documented packages must have docs workspace dependencies; regression tests
exercise actual Turbo affected selection and build hashes.

## Continuous integration

GitHub Actions checks pull requests, pushes to `main`, and manual runs on Ubuntu
24.04. It installs the locked dependencies and matching Chromium with system
libraries, with no browser cache or story-server reuse. Full Git history is
available. The workflow checks the PR head commit explicitly, comparing it to the
PR base SHA; pushes compare the checked-out SHA to the event's previous SHA.

`pnpm run ci` always runs root lint, root type checking, and repository formatting.
Then `lib/ci.mts` runs package lint/typecheck/test tasks using Turbo's built-in
`--affected` dependency-aware selection. Dependency task prerequisites still run
when required. Test support is deliberately not a root dependency, so its changes
do not force unrelated package tests to run. Root/shared configuration participates
in task hashes; configuration packages must also be declared as dependencies by
their consumers. Generated `.turbo` logs are excluded from global inputs.

The comparison must contain valid, available commit SHAs, match the checked-out
head, and have an ancestor base. An absent/zero/invalid/unavailable base, mismatched
head, or unrelated history prints a reason and checks the full workspace. Manual
runs have no comparison base and therefore run everything. Failed Git lookup
never silently skips package checks.

Inspect actual task selection without running tasks:

```sh
# Valid comparison; replace both values with full Git commit SHAs:
CI_BASE_SHA=<base-sha> CI_HEAD_SHA=<checkout-sha> pnpm exec node lib/ci.mts --dry=json

# Explicitly inspect the full fallback:
CI_BASE_SHA= CI_HEAD_SHA= pnpm exec node lib/ci.mts --dry=json

# Run the CI-selection tests without browser fixtures:
pnpm --filter @repo/test-support run test ci.spec.mts
```

The selection tests use temporary Git workspaces and the installed Turbo binary.
They cover changed packages, dependency consumers, shared/root configuration,
invalid comparisons, and test/configuration hashing. They do not duplicate Turbo's
graph algorithm or depend on production page object APIs.
