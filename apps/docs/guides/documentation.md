# Author documentation

Human HTML and the later AI corpus share one source tree. Author guides in `apps/docs`; keep API comments in their owning package. Do not edit `.generated` files. The website currently uses the standard VitePress theme. Branding and layout are separate work.

## Supported text-first Markdown

The shared parser supports headings, paragraphs, lists, blockquotes, emphasis, fenced code, tables, ordinary links, and labelled callouts. Code stays literal, including HTML, apparent links, and container syntax inside fences. Callouts preserve their kind, optional title, and body as a blockquote with a textual label.

```md
::: warning Compatibility
Describe the limitation and what the reader should do.
:::
```

Supported callout kinds are `note`, `tip`, `info`, `warning`, and `danger`. Nested containers and unclosed fences/containers fail validation. Raw HTML/Vue, interpolation, images, unknown containers, and frontmatter are rejected. Put substantive meaning in supported Markdown, not visual components or metadata. Add a tested semantic conversion before extending this subset.

## Maintained excerpts

Use standalone inclusion directives outside code fences:

```md
<!-- @example examples/inline.spec.mts#scenario -->
```

The named region must occur exactly once in a maintained `.spec.mts` source under `examples`. Delimit it with `// #region scenario` and `// #endregion scenario`. Missing, repeated, or unclosed regions fail. The same exact excerpt and source provenance enter the shared model and the HTML input. Inline and prototype examples run in Chromium; TypeScript 7 checks their real imports. The owning prototype's source rules also run.

## API comments and history

Document every exported declaration and intended protected extension point. Explain generic parameters, overload behavior, relevant examples, and useful symbol links. Undocumented exports remain visible and fail checks. Supply owning-package availability metadata on additions; add a change note for meaningful API or behavior changes.

```ts
/** A documented operation.
 * @since @pomeranian/core@Unreleased
 * @remarks Changed in @pomeranian/core@Unreleased: explain the behavior change.
 */
```

Released annotations use actual package versions, such as `@pomeranian/core@1.2.3`; packages need not share a release number. Before shipment, additions and changes use `Unreleased`. Release preparation replaces those markers with actual versions. Typo-only and internal edits need no behavioral history entry.

The generator displays “Available since” and “Changed in” with package-qualified versions. Corresponding guide notes must match API history. Inherited members retain their declaring package's history, rather than acquiring an invented release in each subclass's package. Synthetic regression versions are not production release claims.

## Register a real package

When a production package is established:

1. Add its real workspace dependency to `apps/docs/package.json`.
2. Register each public export in `lib/sources.mts`, naming the owning workspace, actual exported source/declaration entrypoint, production status, and corresponding guide paths.
3. Keep the source entry inside its workspace. Conditional exports may reference the same checked declaration entrypoint. Build declaration inputs before generation through Turbo's dependency graph when needed.
4. Add comments, protected-hook documentation, availability metadata, and guide notes, then replace its status page with links to generated reference.
5. Run documentation checks and verify Turbo selects docs when that package changes.

Registration rejects unregistered production workspaces, undocumented export subpaths, entrypoints that do not match the real manifest, and missing workspace dependencies. New API symbols cannot silently disappear to make coverage pass. Add source/input edges when adding new non-workspace inputs.

## Shared model and diagnostics

`docs:build` writes `.generated/content-model.json` and `.generated/api/api-model.json`. Schema version 1 retains resolved Markdown, structural tokens, headings, links, exact included examples, package status, stable symbol/member identities, parent/inheritance and visibility context, source provenance, rendered HTML routes, grouped signatures, package history, and a complete reflection-to-owner map. The serialized TypeDoc reflection graph preserves generic types, overloads, getter/setter comments, examples, and symbol links for the next exporter. Reflection IDs are local references, not stable output identities.

No `.txt` corpus is produced in this ticket. The following exporter will consume these shared sources and mappings; default module-member Markdown pages must not be mistaken for separate method/property chunks.

TypeDoc and its Markdown/VitePress integration are pinned to the accepted compatibility-proof versions. Its TypeScript 6 dependency is local to docs tooling. All project/tooling and maintained-example checks still use TypeScript 7. VitePress is invoked through its CLI and uses plain JavaScript configuration, avoiding unrelated framework declaration incompatibilities in project checking without weakening shared TypeScript options.

Conversion diagnostics, missing documentation, broken links, invalid history, unsupported content, invalid examples, and generation errors fail the checks. The original prototype's six non-exported-helper warnings remain visible in the compatibility regression evidence, not suppressed in the production generator. [The factory guide](factory-proof.md#accepted-typedoc-limitation) explains the accepted getter defect.

For a live edit, `docs:dev` regenerates from relevant inputs. A failed generation is reported, removes the success marker, and can recover on the next valid edit. Restart after changing dependency installations. `docs:preview` serves the actual `.generated/site/.vitepress/dist` artifact and refuses to substitute a development server or rebuild it implicitly.
