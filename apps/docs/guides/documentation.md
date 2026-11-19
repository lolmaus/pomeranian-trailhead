# Author documentation

Human HTML and agent-readable Markdown share one content pipeline. Author guides in `apps/docs`; keep API comments in their owning package. Canonical API Markdown in `apps/docs/reference` is generated, committed for GitHub access, and used as website input. Do not edit it by hand or edit `.generated` files. The website currently uses the standard VitePress theme. Branding and layout are separate work.

## Supported text-first Markdown

The shared parser supports headings, paragraphs, lists, blockquotes, emphasis, fenced code, tables, ordinary links, and labelled callouts. Code stays literal, including HTML, apparent links, and container syntax inside fences. Callouts preserve their kind, optional title, and body as a blockquote with a textual label.

```md
::: warning Compatibility
Describe the limitation and what the reader should do.
:::
```

Supported callout kinds are `note`, `tip`, `info`, `warning`, and `danger`. Nested containers and unclosed fences/containers fail validation. Raw HTML/Vue, interpolation, images, unknown containers, frontmatter, and VitePress raw code imports (`<<<`) are rejected. Use the checked-example inclusion syntax below for source excerpts. Code-import syntax inside fenced, indented, or inline code stays literal. Put substantive meaning in supported Markdown, not visual components or metadata. Add a tested semantic conversion before extending this subset.

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

`docs:build` writes `.generated/content-model.json` and `.generated/api/api-model.json`. Schema version 1 retains resolved Markdown, structural tokens, headings, links, exact included examples, package status, stable symbol/member identities, parent/inheritance and visibility context, source provenance, rendered HTML routes, grouped signatures, package history, and a complete reflection-to-owner map. Declaration identities use the owning package, registered public export subpath, explicit namespace/declaration path, kind, and static/instance identity. TypeDoc's conditional entrypoint wrappers do not alter existing declaration keys when another package is registered; HTML routes remain separate mappings. Register distinct export subpaths for multiple entries in one package rather than relying on source filenames. The serialized TypeDoc reflection graph preserves generic types, overloads, getter/setter comments, examples, and symbol links for shared reference and text export. Reflection IDs are local references, not stable output identities.

## Canonical reference workflow

After changing an API signature, comment, registered export, or source-derived helper, run `pnpm docs:generate`. Commit the resulting `apps/docs/reference/**/*.md` alongside the source. Methods, properties, accessors and constructors have canonical pages with owning-type and generic context; overloads stay together, inherited members remain discoverable, and export aliases point to the defining document.

`docs:build` and `docs:check` regenerate expected reference in scratch space and compare the complete file set and UTF-8 bytes before publishing. Missing, changed or surplus pages fail with paths and the refresh command. Checking never silently repairs stale reference. `docs:dev` refreshes during source edits, writing only changed bytes. Generated API Markdown is exempt from formatting because it is byte-checked against TypeDoc output.

## Six retrieval levels

1. `/llms.txt`: small discovery following the [llms.txt proposal](https://llmstxt.org/), with title, summary, guidance and descriptive H2 link lists.
2. Individual topics: clean `.md` at the same paths as HTML pages, with checked examples and callouts resolved. No per-page `.txt` twins.
3. Topic, package and type indexes: summaries linking canonical documents and inherited members.
4. Individual member pages: independently retrievable Markdown shared with the website, with overloads and links to owning/generic context.
5. Section and package bundles under `/bundles/`: complete documents with clear boundaries and source links.
6. `/llms-full.txt`: the entire substantive corpus, each canonical document once; indexes and other bundles are not recursively included.

HTML advertises Markdown with `rel="alternate" type="text/markdown"` and discovery with `rel="describedby"`. Published Markdown links to Markdown resources; external links and code remain literal. API source links lead to TypeScript on GitHub. All outputs use the shared content model, not HTML scraping or separate AI prose.

Bundle listings state scope and UTF-8 byte size. Clients may truncate large responses; server output remains complete. Prefer a topic/member for focused tasks, section/package bundles for broader work, and full corpus only when needed. Aggregate links resolve to canonical Markdown targets so repeated headings across documents remain unambiguous.

Discovery/index/bundle outputs stay ignored in `.generated`; canonical API Markdown is the deliberate exception. Checks cover source-model completeness, discovery reachability, links/anchors, path collisions and stale files. Production-preview tests retrieve actual resources and reject HTML fallbacks.

TypeDoc and its Markdown/VitePress integration are pinned to the accepted compatibility-proof versions. Its TypeScript 6 dependency is local to docs tooling. All project/tooling and maintained-example checks still use TypeScript 7. VitePress is invoked through its CLI and uses plain JavaScript configuration, avoiding unrelated framework declaration incompatibilities in project checking without weakening shared TypeScript options.

Conversion diagnostics, missing documentation, broken links, invalid history, unsupported content, invalid examples, and generation errors fail the checks. The original prototype's six non-exported-helper warnings remain visible in the compatibility regression evidence, not suppressed in the production generator. [The factory guide](factory-proof.md#accepted-typedoc-limitation) explains the accepted getter defect.

For a live edit, `docs:dev` regenerates from relevant inputs. A failed generation is reported, removes the success marker, and can recover on the next valid edit. Restart after changing dependency installations. `docs:preview` serves the actual `.generated/site/.vitepress/dist` artifact and refuses to substitute a development server or rebuild it implicitly.

## Publication and live diagnostics

Run these commands from the repository root:

```sh
pnpm docs:dev
pnpm docs:build
pnpm docs:check
pnpm docs:preview
pnpm docs:check:live
```

`docs:check` runs the full compiler, API coverage, canonical-byte, HTML/text link and anchor, completeness/discovery, maintained-example and browser retrieval checks. `docs:preview` serves the existing artifact without rebuilding. `docs:check:live` defaults to https://pomeranian.lolma.us and retrieves the homepage's development label, discovery, getting-started guide, real TextInput overview and appendText member, linked indexes, full corpus and bundles. It rejects failed responses, HTML fallbacks, unexpected cross-origin redirects, wrong content and broken selected Markdown links/anchors. Complete link coverage is checked locally before publication.

Pass an origin and optionally an absolute checked artifact directory to compare downloaded UTF-8 bytes with the artifact:

```sh
pnpm docs:check:live https://pomeranian.lolma.us /absolute/checkout/apps/docs/.generated/site/.vitepress/dist
```

Use an artifact built from the deployed revision; another revision can legitimately differ. The command also accepts a local preview origin for diagnosis. Canonical guide, type and member resources use `.md`; `.txt` is reserved for `/llms.txt` and `/llms-full.txt`. Follow discovery/index links for exact member paths.

CI preserves workspace affected selection and its conservative fallback, then explicitly runs `docs:check` on every PR, main push and manual run. Only successful main push/manual runs upload and deploy the checked `.generated/site/.vitepress/dist` through GitHub Pages; there is no subsequent rebuild. Pull requests never deploy. Main workflow runs and deployments are serialized without cancelling active publication. The root base path serves one development documentation set while retaining package-qualified Released/Unreleased history. Npm publication remains manual and independent.

To republish current main, dispatch CI on `main`. For historical recovery, open a previously successful main CI run containing the publication workflow and choose **Re-run all jobs**. Checkout uses the run's original commit and all installation/checks run again, producing a fresh checked artifact even when the previous one expired. Revisions before this workflow are unsupported. Deployment-only reruns need an unexpired artifact; historical rebuild failures prevent publication and preserve the existing site.

Inspect validation logs first, then retained Playwright reports/traces. For publication failures, inspect the deploy job, Pages Actions source and custom hostname, and `github-pages` environment branch restrictions. Pages must have `pomeranian.lolma.us` registered before DNS points there. The Cloudflare record is a DNS-only CNAME named `pomeranian`, target `lolmaus.github.io`, TTL Auto. Check authoritative/public CNAME resolution and GitHub's domain health, wait for certificate provisioning, enable Enforce HTTPS, then verify trusted HTTPS and HTTP redirection. See GitHub's [custom workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) instructions.
