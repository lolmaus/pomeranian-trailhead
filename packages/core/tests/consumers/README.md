# Packed consumer fixtures

Run `pnpm run build && node lib/verify-consumers.mts` in the core package.
The verifier copies these fixture sources into fresh projects outside the workspace,
packs the actual core, installs it with strict isolated pnpm peers, compiles a
separate generic/private-state library, packs that library, and installs its tarball
in the application. No workspace alias or source import stands in for delivery.

The `.ts.txt` fixtures are intentionally compiled by each consumer's installed
TypeScript 6.0.3 and 7.0.2 as both `.mts` and `.cts`, under NodeNext and Node16.
Negative assertions use `@ts-expect-error` so accepting an unsafe call fails the
consumer check. Declaration checking remains enabled, including native Playwright
and Node types.

Both Playwright Test and standalone playwright styles explicitly install aligned
playwright-core 1.64.1. This is both the selected minimum and current repository
pin, so a second different Playwright version is not claimed. Standalone verification
checks that the runner is absent from resolution and the physical dependency graph.
Each consumer runs Chromium and verifies native query behavior, fresh DOM lookup,
shared ESM/CommonJS/root/direct class and symbol identity, private-path rejection,
and direct-module evaluation isolation. Payload checks require runtime/declaration
maps and included source files for every public module and validate every map path.

Failed runs retain the temporary consumer projects and report their location.
Successful runs remove their temporary project. This command publishes nothing.
