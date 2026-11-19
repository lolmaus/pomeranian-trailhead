# Packed essential consumers

Run `pnpm --filter @pomeranian/lib-essential test` for build, Chromium contracts and actual tarball consumers, or `pnpm --filter @pomeranian/lib-essential test:consumers` after building.

The verifier packs core and essential, installs both into isolated Playwright Test and standalone projects, builds and packs a separate generic composed control library, then compiles `.mts` and `.cts` consumers under NodeNext/Node16 with TypeScript 6.0.3 and 7.0.2. Playwright minimum and repository current both equal 1.64.1; no distinct newer native version is claimed.

Runtime checks cover actual Chromium actions, root/direct ESM/CommonJS identity for all eleven capability/control modules plus Element, one core backend, private export rejection, declarations/maps/included sources and runner absence in standalone dependency graphs. Included fixture sources are `.ts.txt` because each isolated consumer compiles them with its own installed compiler. Nothing is published.

Public first/last/nth/filter narrowing is inherited from core. The package Chromium suite tests existing internal reconstruction compatibility against core's compiled backend without exposing new public paths or changing core lifecycle visibility.
