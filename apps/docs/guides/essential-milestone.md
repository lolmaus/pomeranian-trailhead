# Essential capability ownership and action contract

This is the replacement contract approved in [the capability ownership and sharing decision (#42)](https://github.com/lolmaus/pomeranian-trailhead/issues/42). It deliberately supersedes universal action ownership from [the initial essential action decision (#27)](https://github.com/lolmaus/pomeranian-trailhead/issues/27). The unreleased implementation now supplies the six action bundles and six foundational controls described in the [delivered API reference](../api/lib-essential.md). This specification also describes pending file and additional-flavor slices; their contracts are not availability claims.

## Approved capability bundles

The approved replacement selects the following names and composition hierarchy. `Fillable`, `EditableValue`, `EditableText`, `Checkable`, `CheckableUncheckable` and `SelectableOptions` are delivered. `SelectableFiles` remains pending its separate slice.

| Bundle                 | Builds on       | Adds                    |
| ---------------------- | --------------- | ----------------------- |
| `Fillable`             | Compatible base | `fill`                  |
| `EditableValue`        | `Fillable`      | `clear`                 |
| `EditableText`         | `EditableValue` | `appendText`            |
| `Checkable`            | Compatible base | `check`                 |
| `CheckableUncheckable` | `Checkable`     | `uncheck`, `setChecked` |
| `SelectableOptions`    | Compatible base | `selectOption`          |
| `SelectableFiles`      | Compatible base | `setInputFiles`         |

Each bundle is a capability factory returning a class that extends its compatible base or the named bundle's result. Broader bundles inherit the shared implementation: implement each operation once, rather than redeclaring it in every bundle. Separate internal factories for individual operations are not required.

Public capability factories and bundles use UpperCamelCase names describing an ability or capability-qualified subject. Prefer adjective-first compounds such as `EditableValue` and `EditableText`, or concise `-able` names such as `Fillable`, over operation-style names such as `ValueEditing` and `TextEditing`. Those earlier editing names are superseded. Compound names may explicitly combine abilities, as in `CheckableUncheckable`. This convention applies to capability factories and bundles; page-object class names and native action method names follow their existing conventions.

`Radio` uses `Checkable`; `Checkbox` uses `CheckableUncheckable` and inherits `check` from it. The broader bundle permits both checked-state transitions through `uncheck` and `setChecked`; it does not add a toggle helper. The earlier proposed name `EditableCheckedState` is superseded by `CheckableUncheckable`.

`Select` uses `SelectableOptions` for native select-control operations. `FileInput` uses `SelectableFiles` for native file selection, replacement and clearing through `setInputFiles([])`. Selecting files does not itself upload them to a server, and selecting native options does not promise custom-dropdown automation.

Consumers select the appropriate bundle rather than stacking overlapping bundles. Documentation must explain the inherited operations and potential member collisions; optional CLI checks must understand transitive bundle composition. `EditableText.appendText` retains the narrow text-like input/textarea behavior specified below, excluding structured values and contenteditable.

### Public composition and construction

The selected composition mechanism is public and reusable for component logic, including methods, private state and child page objects. An inherited static `PageObject.with(...)` helper uses its receiver as the base and applies capability factories from left to right. It returns the composed constructor without mutating the receiver. Ordinary consumers retain named class declarations:

```ts
// EditableValue is delivered; Loading is a consumer-defined capability.
class SearchField extends Element.with(EditableValue, Loading) {}
```

Here `Loading` illustrates a consumer-defined capability. Each capability factory accepts a compatible constructor and returns a class extending it; bundles can build directly on other bundles. Base requirements describe the object features needed by the implementation, such as DOM access, rather than proving a live target's HTML type. Context-only capabilities can support grouping page objects too. Classes declare intended capabilities, and native actions retain their own applicability, waiting and error behavior.

Avoiding general DOM capability validation does not remove action-specific preconditions required by custom complete operations. In particular, preserve `appendText`'s explicit rejection of unsupported structured/contenteditable targets. Broader per-action quality-of-life validation remains a future possibility rather than part of this revision.

Keep targets live: input types and matched elements can change after creation, and disabled/readonly/missing state is not a reason to remove methods from the class surface. Preserve operation-specific native label retargeting without rewriting `.locator` to another subject automatically. Native-supported custom controls retain their native behavior; broader component-library adaptations are not implied by a control class name.

Changed in @pomeranian/core@Unreleased: essential classes inherit technically public constructors for generic capability factories; direct construction remains unsupported.

Core constructors are technically public for the typed factory pattern, but direct `new` is unsupported. Core composition is implemented; see the checked [authoring examples](authoring.md). Essential action migration is delivered in #44; the API page includes checked composition and migration examples. Consumers declare a named class extending the composed base, then use that class's inherited `create` or the root fixture. Direct `Base.with(...).create()` is outside supported checked authoring: the tested computed factory result loses its added methods in the inferred type. Construction finalizes after concrete fields initialize. Preserve field-based state/children, root availability before child initialization, late `defaultTarget` capture and fresh concrete reconstruction without copying accumulated state or children.

Reusable generic composed classes retain complete fresh `defaultInstanceType` metadata and use a forwarding `root` getter where required to preserve the exact declared root type. This is generic library-author boilerplate, not a requirement for every mixin, ordinary page object or concrete subclass. Concrete descendants inherit the getter. Documentation and checked examples must show when it is needed; the bounded compiler proof recovered exact root typing with `override get root(): Root { return super.root; }` rather than a consumer cast.

Capability-contributed children are a key feature. Ordinary compatible field overrides customize them, and shared methods access the final child through `this`. Inherited field initializers still run before replacements, so document initialization side effects and captured-child hazards. Normal `override` declarations also express intentional method collision resolution; a forwarding method calling `super` explicitly selects the outer implementation. They do not automatically combine implementations or waive compatibility requirements.

Collision checks belong to the optional standalone CLI, with no runtime collision guard or additional allow-annotation API. Checked mode must inspect original contributions, signatures and member kinds, recognize transitive bundles and compatible overrides, and report unsupported/unverifiable cases explicitly. Successful strict compiler checks are also required for a checked safety claim. Unchecked consumers retain ordinary JavaScript precedence and its known generic-intersection typing limitations; core/essential runtime imports must not require the checker or compiler implementation.

The combined prototype provides bounded compiler, real-Chromium lifecycle, reconstruction and packed-declaration evidence. It implements only one/two-capability overloads, which is not a selected shipping ceiling. Core #43 delivers the flat-list surface and dependent requirements, and essential #44 checks actual composed controls and packed consumers. Full optional CLI/source checking remains #25; do not claim its guarantees from compiler checks alone.

### Assertion capability placement

Assertion capabilities are independently reusable from action bundles. Named classes include their applicable action and assertion capabilities by default as those slices are delivered; ordinary tests do not assemble assertion capabilities manually. An action bundle may reuse an assertion capability where their target applicability truly matches. For example, a radio has assertable unchecked state despite lacking an `uncheck` action, and a hidden input has assertable value state without user-editing actions. Contenteditable text must not be confused with a native input value.

This selects capability placement only. Exact assertion names, negation, organization, retry/timeouts, custom/compound extension and first delivery slices remain in [the assertion API decision (#28)](https://github.com/lolmaus/pomeranian-trailhead/issues/28). Preserve complete retrying assertions on page objects; raw observations remain deliberate low-level operations through `.locator`.

### Direct migration

The author confirms there are no external users yet. When the approved replacement is implemented, directly remove control-specific `fill`, `clear`, `check`, `uncheck`, `setChecked`, `selectOption` and `setInputFiles` methods from `Element`; provide no deprecation bridge or forwarding compatibility aliases there. Keep the general-purpose `blur`, `click`, `dblclick`, `dispatchEvent`, `dragTo`, `focus`, `hover`, `press`, `pressSequentially`, `scrollIntoViewIfNeeded`, `selectText`, `tap` and native-deprecated `type` surface. Preserve native signatures and behavior on the new owners.

Migrate internal tests, maintained examples and human/AI docs together, with a concise before/after guide showing the appropriate specialized classes or capability composition. This deliberately supersedes the initial universal ownership rule when the coordinated implementation lands; the initial delivery remains accepted under its original contract. The native deprecation of `type` is separate from this migration. This policy authorizes no package publication.

### Named native control classes

The contract covers every native HTML input flavor with the following selected class names:

| Input type       | Page-object class    |
| ---------------- | -------------------- |
| `text`           | `TextInput`          |
| `search`         | `SearchInput`        |
| `tel`            | `TelephoneInput`     |
| `url`            | `UrlInput`           |
| `email`          | `EmailInput`         |
| `password`       | `PasswordInput`      |
| `number`         | `NumberInput`        |
| `range`          | `RangeInput`         |
| `color`          | `ColorInput`         |
| `date`           | `DateInput`          |
| `month`          | `MonthInput`         |
| `week`           | `WeekInput`          |
| `time`           | `TimeInput`          |
| `datetime-local` | `LocalDateTimeInput` |
| `checkbox`       | `Checkbox`           |
| `radio`          | `Radio`              |
| `file`           | `FileInput`          |
| `button`         | `ButtonInput`        |
| `submit`         | `SubmitInput`        |
| `reset`          | `ResetInput`         |
| `image`          | `ImageInput`         |
| `hidden`         | `HiddenInput`        |

`SearchInput`, `TelephoneInput`, `UrlInput`, `EmailInput` and `PasswordInput` specialize `TextInput`. `TextArea` remains a separate sibling for textarea controls, sharing editing capabilities through composition. `Select` represents native select controls. `ContentEditable` composes `EditableValue` for native fill/clear behavior on contenteditable elements, without the narrow `appendText` operation or a promise to preserve rich-editor formatting/state.

Names express intended subjects, not eager DOM validation or automatic target discovery. Missing/invalid input types retain native text fallback behavior. Some thin classes share an action surface; button-like and hidden classes initially add no actions beyond the general `Element` surface. These names do not approve submit/reset macros, hidden-value mutation, native picker automation or raw-read wrappers. Numeric stepping, radio-group selection and rich-editor appending retain their separate decision tickets below.

## Complete operations and native compatibility

Follow the [foundational API contract](../concepts.md#product-contract-complete-actions-and-assertions): routine tests express complete actions and assertions through Pomeranian page objects. Raw observations, evaluation, handles and diagnostic captures remain available through `.locator`; comprehensive action coverage does not mean wrapping the entire Locator API.

`Element<Root>` extends core `DomPageObject<Root>` and owns the thirteen general interactions listed in Direct migration above. Control-specific interactions belong to the corresponding bundles and named classes. Class selection expresses intent rather than proving that every operation succeeds on every live target: Playwright retains applicability, cardinality, waiting and error behavior.

The initial inventory is `blur`, `check`, `clear`, `click`, `dblclick`, `dispatchEvent`, `dragTo`, `fill`, `focus`, `hover`, `press`, `pressSequentially`, `scrollIntoViewIfNeeded`, `selectOption`, `selectText`, `setChecked`, `setInputFiles`, `tap`, `type` and `uncheck`. Preserve native deprecation metadata for `type` and recommend `fill` or `pressSequentially` instead. Reconcile coverage with supported Playwright versions as they evolve.

Corresponding methods initially preserve native names, positional arguments, options, return types, waits and errors. An action can retain its native result, such as selected option values, without requiring routine tests to consume it. Raw-read wrappers are not part of this milestone. Assertion organization, negation and naming remain [a separate decision (#28)](https://github.com/lolmaus/pomeranian-trailhead/issues/28).

One approved extension keeps dragging entirely in Pomeranian: `dragTo` accepts a DOM-associated page object as well as a native Locator, resolving the destination's public `.locator` internally. Intended usage, pending implementation:

```ts
await root.Board.Card.dragTo(root.Board.DoneColumn);
```

Future methods may append extra positional arguments after native arguments, and future options may be supersets combining native and Pomeranian fields. These are permitted directions when concrete requirements arise; no additional arguments, option fields or speculative extension plumbing are required now.

## TextInput append behavior

Added in @pomeranian/lib-essential@Unreleased: `TextInput<Root>` and `TextArea<Root>` are sibling classes composing `EditableText` above `Element<Root>`. `EditableText` inherits `fill` and `clear` through `EditableValue`/`Fillable` and owns the single `appendText(text, options?)` implementation, returning `Promise<void>` with native `fill`-compatible options. Text-like flavor subclasses inherit from `TextInput`. The shared append slice is delivered in #37; the additional named flavor subclasses remain #45.

The action reads the existing value internally, concatenates the supplied string at the end and updates through native `fill`, regardless of the caret or selection. It preserves existing text, not a sequence of keyboard events. Tests requiring per-character keyboard events can use inherited `pressSequentially`.

Supported append targets are native text-like inputs (`text`, `search`, `email`, `password`, `tel` and `url`, including implicit text inputs and invalid types resolving to text) and `<textarea>`. Number/date/time and other structured-value controls, plus `contenteditable`, are excluded from this additional operation. Native `fill` retains its own applicability independently of the narrower append contract.

The `contenteditable` exclusion is deliberate. A bounded Chromium investigation found that fill-style appending could preserve words while changing formatting: `<b>Hello</b> <i>world</i>` became `<b>Hello world!</b>`. Rich-editor-preserving operations require their own contract.

Implementation must use native `fill`, without directly assigning DOM values or fabricating replacement events. Do not retry the whole mutation in a way that appends twice. Native constraints/errors remain visible. The read and fill are not atomic against concurrent application edits or target replacements. The custom append precondition rejects labels themselves without automatic associated-control discovery; inherited native actions retain native retargeting.

Preserve core's exact factory/root/generic and composition contracts. Use existing target and `defaultTarget` authoring without new automatic control discovery or broad default selectors. Export the selected public classes and capability factories from the package root and their explicit kebab-case defining modules under the shared ESM/CommonJS identity contract. Include declarations, maps and sources, and verify actual packed core/essential/library consumers on supported compilers and peers.

## Delivery and explicit follow-on work

Changed in @pomeranian/lib-essential@Unreleased: five reusable action bundles and six foundational controls replace universal Element control-action ownership, with no compatibility forwarding. The [API guide](../api/lib-essential.md) provides the complete delivered-owner table and checked before/after migration.

Every feature slice includes incremental real-Chromium TDD as appropriate, exact types, applicable stories, source/API comments, checked examples, migration/authoring guidance, package-qualified Unreleased history, packed-consumer compatibility and human/AI documentation checks. The coordinated control-action migration has landed; additional methods remain in their named follow-on tickets. No npm publication is authorized.

Approved implementation homes:

| Ticket                                                                                                                    | Deliverable                                                                                   | Prerequisite  |
| ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------- |
| [Public typed capability composition (#43)](https://github.com/lolmaus/pomeranian-trailhead/issues/43)                    | Core `.with`, constructor/type authoring, lifecycle and packed declarations                   | This decision |
| [Essential bundle/control migration (#44)](https://github.com/lolmaus/pomeranian-trailhead/issues/44)                     | Delivered control actions move off `Element`; foundational classes and migration              | #43           |
| [Remaining native input flavors (#45)](https://github.com/lolmaus/pomeranian-trailhead/issues/45)                         | Text-family subclasses, structured/button/hidden classes and exports                          | #44           |
| [General Element actions and native FileInput selection (#36)](https://github.com/lolmaus/pomeranian-trailhead/issues/36) | Drag/touch/scroll/events on `Element`; `SelectableFiles`/`FileInput`                          | #43           |
| [EditableText append for sibling controls (#37)](https://github.com/lolmaus/pomeranian-trailhead/issues/37)               | Shared append implementation and sibling adoption                                             | #44           |
| [Optional authoring checker (#25)](https://github.com/lolmaus/pomeranian-trailhead/issues/25)                             | Supported factories/classes/bundles, original member kinds, overrides and strict checked mode | #43           |

[Element/basic delivery (#34)](https://github.com/lolmaus/pomeranian-trailhead/issues/34) and [form-action delivery (#35)](https://github.com/lolmaus/pomeranian-trailhead/issues/35) remain accepted historical work under the initial contract. The replacement is follow-on work, not a reopening of those tickets. Assertion naming and implementation homes remain [decision #28](https://github.com/lolmaus/pomeranian-trailhead/issues/28); its inputs must use this revised ownership and taxonomy without creating artificial prerequisites for native action delivery.

Explicit follow-on decisions retain responsibility for defining their own additional behavior and creating implementation homes:

- [Native MultiSelect incremental selection (#38)](https://github.com/lolmaus/pomeranian-trailhead/issues/38): native option selection already belongs to `SelectableOptions`/`Select`.
- [RadioGroup selection (#39)](https://github.com/lolmaus/pomeranian-trailhead/issues/39): individual `Radio` has `check` only; group-level selection is separate.
- [NumberInput stepping (#40)](https://github.com/lolmaus/pomeranian-trailhead/issues/40): the native class has `EditableValue`; stepping semantics are not implied.
- [Rich-editor text appending (#41)](https://github.com/lolmaus/pomeranian-trailhead/issues/41): `ContentEditable` has native fill/clear; formatting-preserving append remains separate.

`Checkbox.toggle` stays deliberately dropped because `click` serves that interaction. Thin named control classes are now intentionally selected for focused capability surfaces, superseding the initial restriction against classes solely for inherited native actions. Reporting, narrowing, selector setup, integrations and broader image/table coverage retain their own decisions; this contract does not add speculative helpers.

## Native inventory ownership and implementation status

Supported minimum and repository-current Playwright: 1.64.1 (the pins coincide).

| Operations                                                                       | Replacement owner               | Current status / implementation home                                |
| -------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------- |
| click, dblclick, hover, focus, blur, press, pressSequentially, type (deprecated) | `Element`                       | Delivered in #34; retained                                          |
| selectText                                                                       | `Element`                       | Delivered in #35; retained                                          |
| fill                                                                             | `Fillable`                      | Delivered in #44                                                    |
| clear                                                                            | `EditableValue`                 | Delivered in #44                                                    |
| check                                                                            | `Checkable`                     | Delivered in #44                                                    |
| uncheck, setChecked                                                              | `CheckableUncheckable`          | Delivered in #44                                                    |
| selectOption                                                                     | `SelectableOptions`             | Delivered in #44                                                    |
| dispatchEvent, dragTo, scrollIntoViewIfNeeded, tap                               | `Element`                       | Pending revised #36                                                 |
| setInputFiles                                                                    | `SelectableFiles` / `FileInput` | Pending revised #36; never added to `Element` under the replacement |
| appendText (additional operation)                                                | `EditableText`                  | Delivered in #37                                                    |

The first nine rows reconcile the twenty supported-baseline Locator interactions. Reads, handles, waits, captures and assertions are not interaction wrappers. Upstream versions beyond the repository pin are not claimed as tested. Range/color native clear can reject after sanitizing the value; those classes intentionally omit it. Append's narrower validation remains explicit even though general class-wide DOM validation is not selected.
