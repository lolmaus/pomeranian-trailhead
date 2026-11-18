[Pomeranian development reference](../../../../index.md) / [lib-essential/src/text-area](../../../../lib-essential/src/text-area/index.md) / [TextArea](../../../../lib-essential/src/text-area/classes/TextArea.md) / appendText

# Method: appendText()

> **appendText**(`text`, `options?`): `Promise`\<`void`\>

Defined in: [packages/lib-essential/src/editable-text.ts:24](https://github.com/lolmaus/pomeranian-trailhead/blob/main/packages/lib-essential/src/editable-text.ts#L24)

Append to the current value through native fill, independently of caret/selection.
Supports native text/search/email/password/tel/url inputs (including implicit or
invalid types resolved as text) and textarea. Structured inputs, labels and
contenteditable are rejected. Targets are checked at action time.
Options, waiting, constraints and errors remain native fill behavior; this does
not promise per-character keyboard events or rich-editor formatting preservation.
Reading and filling are not atomic against application edits or DOM replacement.

## Parameters

### text

`string`

Text to append after the current value, ignoring caret and selection.

### options?

Native fill options: force bypasses actionability checks,
timeout applies independently to the preliminary read and native fill (not a
shared total budget), signal cancels both stages, and deprecated noWaitAfter
has no effect at the supported Playwright pin.

#### force?

`boolean`

Whether to bypass the [actionability](https://playwright.dev/docs/actionability) checks. Defaults to `false`.

#### noWaitAfter?

`boolean`

This option has no effect.

**Deprecated**

This option has no effect.

#### signal?

`AbortSignal`

Allows to cancel the operation using an
[`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal). If the signal is aborted, the
operation will be aborted and throw an error. Note that providing a signal does not disable the default timeout,
which can be changed using
[browserContext.setDefaultTimeout(timeout)](https://playwright.dev/docs/api/class-browsercontext#browser-context-set-default-timeout)
or [page.setDefaultTimeout(timeout)](https://playwright.dev/docs/api/class-page#page-set-default-timeout); pass
`timeout: 0` to disable the timeout entirely.

#### timeout?

`number`

Maximum time in milliseconds. Defaults to `0` - no timeout. The default value can be changed via `actionTimeout`
option in the config, or by using the
[browserContext.setDefaultTimeout(timeout)](https://playwright.dev/docs/api/class-browsercontext#browser-context-set-default-timeout)
or [page.setDefaultTimeout(timeout)](https://playwright.dev/docs/api/class-page#page-set-default-timeout) methods.

## Returns

`Promise`\<`void`\>

## Since

Available since @pomeranian/lib-essential@Unreleased

## Inherited from

`Element.with( EditableText, ).appendText`


## Context

Owner: [TextArea](../../../../lib-essential/src/text-area/classes/TextArea.md).

## Owner type parameters

### Root

`Root` *extends* `UnboundRoot` = `UnboundRoot`


> **Unreleased @pomeranian/lib-essential API:** @pomeranian/lib-essential implementation from main; no npm release is implied.
