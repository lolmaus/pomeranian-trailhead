[Pomeranian development reference](../../../../index.md) / [lib-essential/src/text-area](../../../../lib-essential/src/text-area/index.md) / [TextArea](../../../../lib-essential/src/text-area/classes/TextArea.md) / filter

# Method: filter()

> **filter**(`options?`): `this`

Defined in: packages/core/dist/dom-page-object.d.ts:55

Return a fresh instance using native Playwright filter semantics.
Supported option values are captured once, including inherited getters and
RegExp contents. Containment arguments are raw relative Locators, not page objects;
native frame restrictions apply. Query evaluation remains lazy and live.

## Parameters

### options?

Native filter criteria; omission retains every source match.

#### has?

`Locator`

Narrows down the results of the method to those which contain elements matching this relative locator. For example,
`article` that has `text=Playwright` matches `<article><div>Playwright</div></article>`.

Inner locator **must be relative** to the outer locator and is queried starting with the outer locator match, not
the document root. For example, you can find `content` that has `div` in
`<article><content><div>Playwright</div></content></article>`. However, looking for `content` that has `article
div` will fail, because the inner locator must be relative and should not use any elements outside the `content`.

Note that outer and inner locators must belong to the same frame. Inner locator must not contain
[FrameLocator](https://playwright.dev/docs/api/class-framelocator)s.

#### hasNot?

`Locator`

Matches elements that do not contain an element that matches an inner locator. Inner locator is queried against the
outer one. For example, `article` that does not have `div` matches `<article><span>Playwright</span></article>`.

Note that outer and inner locators must belong to the same frame. Inner locator must not contain
[FrameLocator](https://playwright.dev/docs/api/class-framelocator)s.

#### hasNotText?

`string` \| `RegExp`

Matches elements that do not contain specified text somewhere inside, possibly in a child or a descendant element.
When passed a [string], matching is case-insensitive and searches for a substring.

#### hasText?

`string` \| `RegExp`

Matches elements containing specified text somewhere inside, possibly in a child or a descendant element. When
passed a [string], matching is case-insensitive and searches for a substring. For example, `"Playwright"` matches
`<article><div>Playwright</div></article>`.

#### visible?

`boolean`

Only matches visible or invisible elements. Prefer the
[locator.visible()](https://playwright.dev/docs/api/class-locator#locator-visible) shortcut when matching only
visible elements.

## Returns

`this`

A fresh instance preserving the concrete API, root and generic parameters.

## Since

Available since @pomeranian/core@Unreleased

## Inherited from

`Element.with( EditableText, ).filter`


## Context

Owner: [TextArea](../../../../lib-essential/src/text-area/classes/TextArea.md).

## Owner type parameters

### Root

`Root` *extends* `UnboundRoot` = `UnboundRoot`


> **Unreleased @pomeranian/lib-essential API:** @pomeranian/lib-essential implementation from main; no npm release is implied.
