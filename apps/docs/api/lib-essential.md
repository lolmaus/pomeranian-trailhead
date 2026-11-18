# @pomeranian/lib-essential

Status: implemented Unreleased general interactions, reusable action capabilities and foundational controls, locally buildable and packable. No npm publication exists.

`Element<Root>` extends core `DomPageObject<Root>` and inherits its exact factories, grouping, application roots and explicit target/defaultTarget authoring. Constructors are technically public for class-factory composition; direct `new` remains unsupported. Its delivered general actions are `click`, `dblclick`, `hover`, `focus`, `blur`, `press`, `pressSequentially`, native-deprecated `type` and `selectText`.

Control actions have complete native contracts: parameters, options, results, applicability, waits and errors are preserved through the live `.locator`. `selectOption` returns `Promise<string[]>`; routine tests may ignore the result. These are complete actions; deliberate raw observations remain on `.locator`.

<!-- @example examples/essential.spec.mts#essential -->

## Delivered owners

| Action                                                                                            | Defining capability                            | Foundational controls                                                           |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| `fill`                                                                                            | `Fillable`                                     | Inherited through `EditableValue` by `TextInput`, `TextArea`, `ContentEditable` |
| `clear`                                                                                           | `EditableValue` (builds on `Fillable`)         | `TextInput`, `TextArea`, `ContentEditable`                                      |
| `appendText`                                                                                      | `EditableText` (builds on `EditableValue`)     | `TextInput`, `TextArea`                                                         |
| `check`                                                                                           | `Checkable`                                    | `Radio`; inherited through `CheckableUncheckable` by `Checkbox`                 |
| `uncheck`, `setChecked`                                                                           | `CheckableUncheckable` (builds on `Checkable`) | `Checkbox`                                                                      |
| `selectOption`                                                                                    | `SelectableOptions`                            | `Select`                                                                        |
| `click`, `dblclick`, `hover`, `focus`, `blur`, `press`, `pressSequentially`, `type`, `selectText` | `Element`                                      | Inherited by all six controls                                                   |

Each operation has one implementation inherited through the bundle hierarchy. `TextInput` and `TextArea` are siblings. `Radio` has no `uncheck` or `setChecked`; `ContentEditable` has fill/clear without `appendText`. There is no `toggle` helper. Assertion capabilities remain independently composable under [decision #28](https://github.com/lolmaus/pomeranian-trailhead/issues/28), without an implemented assertion API in this slice.

## Migration from universal Element actions

Changed in @pomeranian/lib-essential@Unreleased: `fill`, `clear`, `check`, `uncheck`, `setChecked` and `selectOption` move off `Element` with no compatibility forwarding. The initial form delivery (#35) remains accepted history. `selectText` stays on `Element`; native `type` deprecation is separate from this ownership change. Use `TextInput.fill` for replacement or inherited `pressSequentially` for keyboard input.

Previously `Element.create(page, "input").fill("Ada")` supplied the form action. Now select an appropriate control explicitly:

<!-- @example examples/essential.spec.mts#forms -->

Alternatively, give a named custom component only the capabilities it needs. A capability requires a public `locator: Locator`, so it can compose above core `DomPageObject` or a custom DOM component without inheriting `Element`. It does not inspect or discover the target type:

<!-- @example examples/essential.spec.mts#essential-authoring -->

All six controls require explicit targets unless an application subclass declares `defaultTarget`. Names express intended subjects rather than eagerly proving DOM type. Native fill can act on supported structured inputs, labels retarget only for native-supported operations, and readonly/disabled/missing state retains native waiting. A control's `.locator` still identifies its original target, including a label. DOM replacements and type changes are evaluated when each action runs. Explicitly applying `CheckableUncheckable` to a radio does not make native unchecking valid.

## Appending native text

Added in @pomeranian/lib-essential@Unreleased: `EditableText` composes `EditableValue` (and therefore `Fillable`) and owns `appendText(text, options?): Promise<void>`. `TextInput` and `TextArea` now compose this bundle as siblings. Existing fill/clear calls retain their native behavior. Custom components that need append should select `EditableText` once instead of stacking it with either ancestor bundle.

Append reads the current native value internally, concatenates the suffix at the end regardless of selection or caret, and calls native `fill` with the supplied options. It retains fill's native constraints, waiting and errors; it does not promise per-character keyboard events. The read and fill are not atomic against concurrent application changes: an edit or target replacement between them can change or overwrite the result. The operation does not retry the whole read/append/fill mutation.

Native fill options include `force`, `timeout`, `signal` and deprecated `noWaitAfter` (which has no effect at the supported pin). The timeout applies to each stage independently, rather than imposing a single total budget. The signal cancels either stage; force affects native fill's actionability checks and does not bypass append's supported-target check.

The live target must be a native text/search/email/password/tel/url input (including implicit or invalid types resolving to text) or textarea. Structured controls such as number/date, contenteditable, labels and other elements are explicitly rejected for append. Inherited native fill/clear keep their own broader applicability, including native label retargeting; append does not discover a label's associated control. `.locator` and explicit targets/defaultTarget retain their original meaning. Check happens at action time, so a class name does not cache or guarantee a DOM type.

The checked form example above appends a surname after selection without replacing the existing name. Standalone textarea and application-bound subclass examples use the same implementation:

<!-- @example examples/essential.spec.mts#append -->

For a custom base or generic library wrapper, the checked authoring example above selects `EditableText`. Preserve fresh `defaultInstanceType` metadata for root/default/extra parameters and the forwarding root getter when needed. Future `SearchInput`, `TelephoneInput`, `UrlInput`, `EmailInput` and `PasswordInput` classes in #45 inherit this behavior through `TextInput`. `ContentEditable` deliberately remains on `EditableValue`; rich-editor formatting preservation belongs to #41.

## Composition safety and customization

Use the broadest required bundle once: `EditableText` already includes `EditableValue` and `Fillable`, `EditableValue` includes `Fillable`, and `CheckableUncheckable` already includes `Checkable`. Stacking overlapping bundles creates redundant contributions and can cause member collisions. Ordinary JavaScript precedence applies; composition performs no runtime collision check. Compatible `override` methods can explicitly call `super`, but do not automatically combine competing implementations.

Capabilities can contribute children and shared behavior. Compatible child overrides customize the final child read through `this`; inherited initializers still run, and previously captured children retain their original identity and side effects. See the checked [child customization examples](../guides/authoring.md#contributed-children-and-initialization). Reusable generic composed wrappers declare fresh metadata for all independent parameters and, where required, a forwarding root getter as shown above. Concrete descendants inherit those contracts.

Strict compiler proofs cover tested factory/default/root/generic contracts and reject grouping bases lacking a Locator. They do not validate original member kinds or every unsafe source form. The optional checker (#25) is pending; a checked safety claim requires its source checks together with strict compiler checks when delivered. Ordinary consumers retain unchecked JavaScript behavior and generic-intersection limitations. Runtime imports require neither the checker nor a compiler.

## Package entry points and remaining work

Every delivered class and factory is exported from `@pomeranian/lib-essential` and its explicit kebab-case defining module, for example `/text-input`, `/text-area`, `/content-editable`, `/fillable`, `/editable-value`, `/editable-text`, `/checkable`, `/checkable-uncheckable` and `/selectable-options`. `/element`, `/checkbox`, `/radio` and `/select` complete the inventory. Root/direct ESM and CommonJS exports share the same runtime identities. Included sources, declarations and maps support debugging; source/dist implementation paths are not public imports.

Build core and essential before packing; installed consumers use both tarballs with aligned consumer-supplied playwright-core and runner or standalone playwright peers. The verified minimum/current Playwright pins coincide at 1.64.1; TypeScript consumer checks cover 6.0.3 and 7.0.2. No automatic selectors or npm publication are introduced.

Remaining native input flavors (#45) and general/file interactions (#36) remain pending. No `setInputFiles`, `dragTo`, `dispatchEvent`, `tap` or `scrollIntoViewIfNeeded` wrapper is delivered here. See the complete [essential action contract](../guides/essential-milestone.md).

Available since @pomeranian/lib-essential@Unreleased.

Inherited construction and target APIs: Available since @pomeranian/core@Unreleased.
