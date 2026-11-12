# Getting started

Begin with a small real-browser scenario using the locally built production core. See [installation](installation.md) for the unreleased package and aligned peer requirements.

<!-- @example examples/core.spec.mts#construction -->

The app fixture establishes root identity before child fields initialize. Grouping Menu forwards the app DOM scope to its button. This core slice uses native Locator assertions; universal action/assertion methods are later essential-layer work.

## An independent browser scenario

The following contributor example also verifies the browser directly.

After [setting up the repository](installation.md), run:

```sh
pnpm --filter @repo/docs exec playwright test examples/inline.spec.mts
```

The maintained test below runs against Chromium and is checked by TypeScript 7. The rendered excerpt comes directly from that file, so editing the displayed code means editing the executable example.

<!-- @example examples/inline.spec.mts#scenario -->

`page.setContent` creates a fresh scenario in the test's browser context. The ordinary Playwright assertion independently verifies what happened after the click.

Continue with [construction and DOM targets](guides/construction.md) and [library authoring](guides/authoring.md). The [historical factory proof](guides/factory-proof.md) is separate bounded evidence. To add a larger shared scenario later, follow [the testing guide](guides/testing.md).
