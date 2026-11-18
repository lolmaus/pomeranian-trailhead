[Pomeranian development reference](../../../../index.md) / [lib-essential/src/text-area](../../../../lib-essential/src/text-area/index.md) / [TextArea](../../../../lib-essential/src/text-area/classes/TextArea.md) / constructor

# Constructor: constructor()

# Constructor

> **new TextArea**\<`Root`\>(`context`, `target?`, `asRoot?`): [`TextArea`](../../../../lib-essential/src/text-area/classes/TextArea.md)\<`Root`\>

Defined in: packages/core/dist/dom-page-object.d.ts:29

Technically public for capabilities; construct through named create/rootFixture.
Inherit the constructor; defaults are captured after subclass fields complete.

## Parameters

### context

`Page` \| `PageObject`\<`Root`\>

### target?

`Target`

### asRoot?

`boolean`

## Returns

[`TextArea`](../../../../lib-essential/src/text-area/classes/TextArea.md)\<`Root`\>

## Remarks

Changed in @pomeranian/core@Unreleased: public constructor authoring enables
generic capability factories; supported construction still uses named factories.

## Since

Available since @pomeranian/core@Unreleased

## Inherited from

`Element.with( EditableText, )<Root>.constructor`


## Context

Owner: [TextArea](../../../../lib-essential/src/text-area/classes/TextArea.md).

## Owner type parameters

### Root

`Root` *extends* `UnboundRoot` = `UnboundRoot`


> **Unreleased @pomeranian/lib-essential API:** @pomeranian/lib-essential implementation from main; no npm release is implied.
