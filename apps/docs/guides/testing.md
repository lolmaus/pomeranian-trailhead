# Chromium testing

Available since @repo/test-support@Unreleased

The private `@repo/test-support/config` workspace export supplies framework-independent Chromium defaults. It is repository development infrastructure, not a consumer dependency or published Pomeranian API. Its [generated reference](../reference/development/config/variables/testConfig.md) comes from the owning source comment.

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

## Shared React Storybook

Keep small framework-independent scenarios inline. Extract large or reused cases into `*.stories.tsx` beside their package's tests. The shared React host discovers those files; it does not own their scenarios or provide a shared route/reset application. Extracted plain HTML uses TSX in the same host, including the counter fixture owned by `packages/test-support`.

```sh
pnpm run storybook
```

Open `http://127.0.0.1:6006` to browse the catalog without Playwright. Find **Ant Design / Button**, open **Primary**, and click **Open details** to interact with the real styled Ant Design modal. Its dialog is portaled into the document body. The fixture workspace is private development infrastructure; it does not establish a published Ant Design package, production component coverage, or a supported-version range.

Stories own React state, event handlers, providers, CSS, and assets. Node tests own Playwright actions and assertions. React and Storybook remain development dependencies of the workspaces authoring stories. Do not import a UI module at runtime just to select its story.

## Authoring and typed selection

Available since @repo/test-support@Unreleased

Use an explicit literal title and conventional CSF object exports. Preserve the metadata object's literal types with `as const`, then check it with `satisfies Meta`. Keeping those assertions separate also lets the maintained indexer recognize the metadata.

```tsx
import type { Meta, StoryObj } from "@storybook/react";

function Counter({ initial }: { initial: number }) {
  return <button>{initial}</button>;
}

const meta = {
  title: "Examples/Counter",
  component: Counter,
  args: { initial: 0 },
} as const;
meta satisfies Meta<typeof Counter>;
export default meta;

export const Empty: StoryObj<typeof meta> = {};
export const WithInitialValue: StoryObj<typeof meta> = {
  args: { initial: 3 },
};
```

Name exports for meaningful scenarios. Reuse local components and use `args` for small data variations. Storybook `parameters` configure story/tooling behavior; they are not arbitrary values passed into a Node-side rendering callback. Keep callbacks and framework lifecycle in the browser story, and let each test begin with Playwright's ordinary fresh context.

Bind once per module in the consuming test:

```ts
import { expect, test } from "@playwright/test";
import { typedStories } from "@repo/test-support/stories";

const openButton = typedStories<typeof import("./button.stories.tsx")>("Ant Design/Button", {
  baseURL: "http://127.0.0.1:6006",
  ready: (page) => page.getByRole("button", { name: "Open details" }),
});

test("opens the dialog", async ({ page }) => {
  await openButton(page, "Primary");
  await page.getByRole("button", { name: "Open details" }).click();
  await expect(page.getByRole("dialog")).toContainText("Portaled content");
});
```

The `typeof import` reference is erased during transpilation. Real TypeScript checks the module path, literal title, and named export. Widened `string` titles are rejected. A raw CSF story object does not need an `.id` property. Helpers can be real module exports without being indexed stories, so compile-time export checking alone does not prove discoverability.

The navigator fetches `/index.json` on each call, matches the exact title and export name, and uses the actual indexed ID for the direct preview. It does not copy Storybook's slug algorithm or retain a stale process-wide index. Missing, excluded, ambiguous, and non-story entries fail at runtime. Titles altered by host prefixes must agree with the generated index.

Choose a meaningful readiness locator that is visible once the intended scenario renders. The helper waits for it with a bounded timeout and reports the requested title/export and index URL with failures. Browser errors and Storybook's rendering error display provide diagnostics for broken scenarios. Navigation preserves the normal `page`, including portaled content; no artificial root scope is returned.

Browser-only story projects and the explicit story-reference test projects check TSX separately from the ordinary Node-only project. They accommodate JSX/browser declarations for static inspection, without changing where tests run. Story-related projects skip incompatible third-party declaration-file checking; repository source and positive/negative title/export contracts remain strict. Playwright transpilation does not replace these compiler checks.

## Hosted tests and lifecycle

Use the story-specific Playwright configuration to start only the needed host. The shared Chromium defaults and direct inline harness command do not start Storybook.

```sh
# Existing inline and Node-focused harness, without a story server:
pnpm --filter @repo/test-support run test browser.spec.mts

# Package-owned story scenarios, with automatic host startup:
pnpm --filter @repo/test-support run test:stories
pnpm --filter @repo/ant-design-fixtures run test

# Select a file, line, or title using ordinary Playwright options:
pnpm --filter @repo/ant-design-fixtures run test button.spec.mts
pnpm --filter @repo/ant-design-fixtures run test button.spec.mts -g "dialog"

# Debug using the same package-owned configuration:
pnpm --filter @repo/ant-design-fixtures run test --headed
pnpm --filter @repo/ant-design-fixtures run test --debug
pnpm --filter @repo/ant-design-fixtures run test --ui
```

`@repo/test-support/story-server` supplies the framework-independent lifecycle helpers `storyURL`, `storyServer`, and `assertStoryHost`. Use one explicit port per independently running suite. The manual host uses 6006, test-support uses 6007, and Ant Design uses 6008. Override the latter two with `STORYBOOK_SUPPORT_PORT` and `STORYBOOK_ANTD_PORT` when those ports are already in use. Configure a binding's `baseURL` with the same `storyURL(port)` as its Playwright configuration.

Playwright starts and stops servers it owns. Local runs can reuse a suitable host at the suite's port. Identity validation checks both the checkout identity and the generated index, so a server from another checkout or an unrelated application fails clearly. A busy incompatible port is not silently reused or terminated. Set `STORYBOOK_FRESH=1` for a fresh server; CI also disables reuse. Stop your existing server first if it occupies the requested port.

```sh
STORYBOOK_FRESH=1 pnpm --filter @repo/test-support run test:stories
STORYBOOK_FRESH=1 pnpm --filter @repo/ant-design-fixtures run test
```

For failures, read the requested title/export and URL in the navigation error. Check the manual catalog and `/index.json` for discovery or prefix problems. Inspect the Storybook error display and browser trace for render errors. Use the ordinary Playwright report and retained traces/screenshots described in the repository README. Readiness timeouts often indicate a stale selector or UI setup that never reached the expected state; extending the timeout does not fix a failed render.

The root test route includes hosted tests, while CI also checks a real Storybook build. Full test and CI routes run one workspace task at a time to bound memory usage; Playwright workers within a suite can still run in parallel. Shared host configuration, external story fixtures and their browser helpers participate conservatively in Turbo invalidation and affected selection. This can run additional packages rather than skip a required scenario. Tests do not cache browser results, and navigation refreshes index discovery on every call.
