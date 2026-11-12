# Installation and development status

No `@pomeranian` package has been published yet. Production `@pomeranian/core` can be built and packed locally; [the standalone recipe](recipes/standalone.md) shows tarball installation. For Playwright Test consumers, install the tarball with `@playwright/test@1.64.1` and `playwright-core@1.64.1`. Always supply playwright-core at the exact native runner/library version. Core peers support >=1.64.1 <2; the range alone does not enforce alignment.

Core supports ESM and CommonJS root/direct imports through one shared runtime, strict TypeScript 6.0.3 and 7.0.2 consumer checks, NodeNext/Node16 resolution and ES2022-compatible output across maintained Node LTS lines. Native declarations require Node ambient types and modern lib definitions. No selector registration or optional source checker is required for this slice.

## Set up this repository

Use the Node version recorded in `.nvmrc` and the pnpm version declared in the root `package.json`. Clone the repository, then run from its root:

```sh
pnpm install
pnpm run test:install
pnpm run check
```

`test:install` installs the Chromium browser required by Playwright. Inline HTML core scenarios need neither React nor Storybook; the repository also has a separate shared React Storybook test workflow.

## Documentation commands

| Command                 | Result                                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run docs:dev`     | Validates sources, generates the reference, and watches relevant inputs with live preview.                                    |
| `pnpm run docs:build`   | Generates the shared model and builds static HTML.                                                                            |
| `pnpm run docs:preview` | Serves the already built production artifact. It does not regenerate source content.                                          |
| `pnpm run docs:check`   | Checks compilers, content, reference generation, internal HTML links and anchors, maintained examples, and Chromium behavior. |

The root project checks use TypeScript 7. TypeDoc runs with the documentation workspace's separate supported TypeScript 6 dependency. Changing the generator compiler does not change the compiler used to check project code or maintained examples.

The site documents the current development tree. Package-qualified release annotations distinguish shipped versions from `Unreleased`; future release snapshots and deployment are separate work.
