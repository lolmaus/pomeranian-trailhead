# Standalone Playwright

Available since @pomeranian/core@Unreleased.

Use the same core package with standalone `playwright`, without Playwright Test or an application-root wrapper. Core receives your Page and has no runner runtime dependency. This native-only slice needs no selector setup or registration.

## Install aligned peers

Core is unreleased; first build and pack it in this repository:

```sh
pnpm --filter @pomeranian/lib-essential build
pnpm --filter @pomeranian/core pack --pack-destination /tmp
pnpm --filter @pomeranian/lib-essential pack --pack-destination /tmp
```

In a separate consumer project, install the generated tarball with aligned native packages:

```sh
pnpm add /tmp/pomeranian-core-0.1.0.tgz /tmp/pomeranian-lib-essential-0.1.0.tgz playwright@1.64.1 playwright-core@1.64.1
pnpm add -D typescript@7.0.2 @types/node
pnpm exec playwright install chromium
```

Supply `playwright-core` at the same exact version as `playwright`. The peer range `>=1.64.1 <2` alone does not enforce equality or prevent package-manager peer auto-installation. Native Playwright declarations need Node ambient types and modern compiler libraries. Use strict TypeScript with NodeNext or Node16 resolution; the minimum verified compiler is 6.0.3, alongside 7.0.2. Supported runtime output uses ES2022 and maintained Node LTS lines; development follows the pinned repository Node.

## Own the lifecycle

<!-- @example examples/standalone.spec.mts#standalone -->

Always close the context and browser, including on failure. A browser may contain many contexts and Pages; each object belongs to the specific supplied Page. Standalone use provides native Playwright queries and core page-object construction, not runner fixtures or automatic test cleanup.

The checked example imports `chromium` directly from `playwright`. The package verifier additionally installs a clean external standalone consumer with no `@playwright/test` dependency, builds a separate generic page-object library, and validates its consumer through the packed declarations. It does not publish any package.

Public selector registration, custom Page settings and test-ID fixture forwarding belong to the later setup/configuration slice. No not-yet-implemented setup export is required or shown here. For rooted Playwright Test usage, see [construction](../guides/construction.md); for tabs and frames, see [multiple Pages](multiple-pages.md).

Element basic actions: Available since @pomeranian/lib-essential@Unreleased. Its native actions also work in standalone consumers.
