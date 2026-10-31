# Installation and development status

No `@pomeranian` package is published or installable from this repository yet. The planned package names in the [API reference](api/index.md) describe intended ownership, not available npm releases.

## Set up this repository

Use the Node version recorded in `.nvmrc` and the pnpm version declared in the root `package.json`. Clone the repository, then run from its root:

```sh
pnpm install
pnpm run test:install
pnpm run check
```

`test:install` installs the Chromium browser required by Playwright. React and Storybook integration is separate work; the current inline HTML scenarios need neither.

## Documentation commands

| Command                 | Result                                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run docs:dev`     | Validates sources, generates the reference, and watches relevant inputs with live preview.                                    |
| `pnpm run docs:build`   | Generates the shared model and builds static HTML.                                                                            |
| `pnpm run docs:preview` | Serves the already built production artifact. It does not regenerate source content.                                          |
| `pnpm run docs:check`   | Checks compilers, content, reference generation, internal HTML links and anchors, maintained examples, and Chromium behavior. |

The root project checks use TypeScript 7. TypeDoc runs with the documentation workspace's separate supported TypeScript 6 dependency. Changing the generator compiler does not change the compiler used to check project code or maintained examples.

The site documents the current development tree. Package-qualified release annotations distinguish shipped versions from `Unreleased`; future release snapshots and deployment are separate work.
