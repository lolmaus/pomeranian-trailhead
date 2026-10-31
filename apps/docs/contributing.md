# Contributing

Keep requirements and evolving design decisions on [the project map](https://github.com/lolmaus/pomeranian-trailhead/issues/2). Do not turn a prototype or a hypothetical example into an undocumented production decision.

## Complete a behavior slice

1. Establish one meaningful failing check at an observable seam.
2. Implement the smallest behavior that satisfies it, then refactor with checks green.
3. Add or update the relevant Chromium scenario and maintained example.
4. Document exported APIs and intended protected extension points in their owning source files.
5. Update the applicable guide and owning-package availability/change notes.
6. Run `pnpm run check` and `pnpm run docs:check`.

The repository uses pnpm workspaces, Turbo, shared strict TypeScript configurations, Oxlint, Oxfmt, commitlint, and Lefthook. Preserve those checks. Conventional commits associated with a work ticket carry its non-closing `Refs: #number` trailer. Package publication and releases remain manual.

## Documentation workflow

Read [documentation authoring](guides/documentation.md) for the supported text-first Markdown subset, checked excerpts, the shared model, and how to register production APIs. Generated files are ignored and must never replace their authored sources.

Run `pnpm run docs:dev` while editing. Run `pnpm run docs:build` before `pnpm run docs:preview` to inspect the actual production artifact. Deployment, the AI text corpus, visual branding, and release snapshots are separate work.
