# Getting started

Begin with a small real-browser scenario. This is a repository contributor example using Playwright directly, not a Pomeranian installation example.

After [setting up the repository](installation.md), run:

```sh
pnpm --filter @repo/docs exec playwright test examples/inline.spec.mts
```

The maintained test below runs against Chromium and is checked by TypeScript 7. The rendered excerpt comes directly from that file, so editing the displayed code means editing the executable example.

<!-- @example examples/inline.spec.mts#scenario -->

`page.setContent` creates a fresh scenario in the test's browser context. The ordinary Playwright assertion independently verifies what happened after the click.

To investigate the current factory contract, continue with [the explicitly provisional factory proof](guides/factory-proof.md). To add a larger shared scenario later, follow [the testing guide](guides/testing.md).
