# @pomeranian/core

Status: implemented, Unreleased, locally buildable and packable. No npm publication is implied.

Available since @pomeranian/core@Unreleased.

Public defining modules are `page-object`, `dom-page-object`, `root-fixture`, `authoring` and `target`; the root provides convenience exports. ESM and CommonJS share class/symbol identity and declarations. There are no wildcard internal exports.

| API             | Source-generated reference                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| `PageObject`    | [Context, root and inherited construction](../reference/development/core/src/page-object/classes/PageObject.md) |
| `DomPageObject` | [Targets and native Locator access](../reference/development/core/src/dom-page-object/classes/DomPageObject.md) |
| `rootFixture`   | [Fixture-designated roots](../reference/development/core/src/root-fixture/functions/rootFixture.md)             |
| `checkLibrary`  | [Library conformance](../reference/development/core/src/authoring/functions/checkLibrary.md)                    |

Read [construction and targets](../guides/construction.md), [library authoring](../guides/authoring.md), [standalone Playwright](../recipes/standalone.md) and [multiple Pages](../recipes/multiple-pages.md). Exact source-generated signatures appear in [the generated reference](../reference/development/index.md). The historical URL namespace also contains private test infrastructure; each page states its own package status.

Public narrowing, selector setup/Page configuration and the optional authoring checker have separate implementation tickets. Element belongs to lib-essential; no placeholder is exported from core.
