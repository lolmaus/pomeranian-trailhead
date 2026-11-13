# Initial essential action milestone

This is the approved product specification from [the essential action decision (#27)](https://github.com/lolmaus/pomeranian-trailhead/issues/27), not an implemented API reference. `@pomeranian/lib-essential` now implements the eight basic interactions and seven native form actions and remains unreleased. Implementation tickets deliver each complete slice before its APIs are documented as available.

## Complete operations and native compatibility

Follow the [foundational API contract](../concepts.md#product-contract-complete-actions-and-assertions): routine tests express complete actions and assertions through Pomeranian page objects. Raw observations, evaluation, handles and diagnostic captures remain available through `.locator`; comprehensive action coverage does not mean wrapping the entire Locator API.

`Element<Root>` extends core `DomPageObject<Root>` and owns all native Locator interactions, including form actions. Universal ownership does not mean every action applies to every HTML element: Playwright retains its applicability, cardinality, waiting and error behavior.

The initial inventory is `blur`, `check`, `clear`, `click`, `dblclick`, `dispatchEvent`, `dragTo`, `fill`, `focus`, `hover`, `press`, `pressSequentially`, `scrollIntoViewIfNeeded`, `selectOption`, `selectText`, `setChecked`, `setInputFiles`, `tap`, `type` and `uncheck`. Preserve native deprecation metadata for `type` and recommend `fill` or `pressSequentially` instead. Reconcile coverage with supported Playwright versions as they evolve.

Corresponding methods initially preserve native names, positional arguments, options, return types, waits and errors. An action can retain its native result, such as selected option values, without requiring routine tests to consume it. Raw-read wrappers are not part of this milestone. Assertion organization, negation and naming remain [a separate decision (#28)](https://github.com/lolmaus/pomeranian-trailhead/issues/28).

One approved extension keeps dragging entirely in Pomeranian: `dragTo` accepts a DOM-associated page object as well as a native Locator, resolving the destination's public `.locator` internally. Intended usage, pending implementation:

```ts
await root.Board.Card.dragTo(root.Board.DoneColumn);
```

Future methods may append extra positional arguments after native arguments, and future options may be supersets combining native and Pomeranian fields. These are permitted directions when concrete requirements arise; no additional arguments, option fields or speculative extension plumbing are required now.

## TextInput append behavior

`TextInput<Root>` extends `Element<Root>`. Its selected additional operation is `appendText(text, options?)`, returning `Promise<void>` with native `fill`-compatible options.

The action reads the existing value internally, concatenates the supplied string at the end and updates through native `fill`, regardless of the caret or selection. It preserves existing text, not a sequence of keyboard events. Tests requiring per-character keyboard events can use inherited `pressSequentially`.

Supported append targets are native text-like inputs (`text`, `search`, `email`, `password`, `tel` and `url`, including implicit text inputs) and `<textarea>`. Number/date/time and other structured-value controls, plus `contenteditable`, are excluded from this additional operation. Inherited native `fill` retains its full native applicability.

The `contenteditable` exclusion is deliberate. A bounded Chromium investigation found that fill-style appending could preserve words while changing formatting: `<b>Hello</b> <i>world</i>` became `<b>Hello world!</b>`. Rich-editor-preserving operations require their own contract.

Implementation must use native `fill`, without directly assigning DOM values or fabricating replacement events. Do not retry the whole mutation in a way that appends twice. Native constraints/errors remain visible, and the operation does not promise an atomic transaction against concurrent application edits.

Preserve core's exact factory/root/generic and composition contracts. Use existing target and `defaultTarget` authoring without new automatic control discovery or broad default selectors. Export `Element` and `TextInput` from the package root and their defining `/element` and `/text-input` modules under the approved shared ESM/CommonJS identity contract.

## Delivery and explicit follow-on work

Deliver the package/basic interactions first. Native form actions and other interactions can then proceed independently; `TextInput.appendText` follows the form actions. Every slice includes incremental real-Chromium TDD, types, applicable stories, source comments, checked examples, package-qualified Unreleased history, packed-consumer compatibility and human/AI documentation checks. No npm publication is authorized by this specification.

Implementation homes:

- [Establish lib-essential Element and basic interactions (#34)](https://github.com/lolmaus/pomeranian-trailhead/issues/34).
- [Implement Element form-control actions (#35)](https://github.com/lolmaus/pomeranian-trailhead/issues/35).
- [Implement Element drag, touch, upload and event actions (#36)](https://github.com/lolmaus/pomeranian-trailhead/issues/36).
- [Implement TextInput fill-style appendText (#37)](https://github.com/lolmaus/pomeranian-trailhead/issues/37).

Explicit follow-on decisions, each responsible for creating implementation homes after its contract is approved:

- [Define native MultiSelect incremental selection (#38)](https://github.com/lolmaus/pomeranian-trailhead/issues/38).
- [Define RadioGroup selection (#39)](https://github.com/lolmaus/pomeranian-trailhead/issues/39).
- [Define NumberInput stepping (#40)](https://github.com/lolmaus/pomeranian-trailhead/issues/40).
- [Define rich-editor text appending (#41)](https://github.com/lolmaus/pomeranian-trailhead/issues/41).

Further essential/integration coverage and full authoring guides remain visible on the project map.

`Checkbox.toggle` was explicitly dropped because `click` already provides that interaction. Do not introduce a `Checkbox` or `Select` class merely to rename inherited actions. A future specialized class must supply meaningful additional capabilities. Reporting, narrowing, selector setup and integration contracts retain their separate tickets.

## Native inventory ownership

Supported minimum and repository-current Playwright: 1.64.1 (the pins coincide).

| Operations                                                                       | Delivery                      |
| -------------------------------------------------------------------------------- | ----------------------------- |
| click, dblclick, hover, focus, blur, press, pressSequentially, type (deprecated) | Implemented Unreleased in #34 |
| check, clear, fill, selectOption, selectText, setChecked, uncheck                | Implemented Unreleased in #35 |
| dispatchEvent, dragTo, scrollIntoViewIfNeeded, setInputFiles, tap                | Pending #36                   |

This reconciles all twenty interactions in the supported Locator baseline, including deprecated type. Reads, handles, waits, captures and assertions are not interaction wrappers. Current upstream versions beyond the supported repository pin are not claimed as tested.
