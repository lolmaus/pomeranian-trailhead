[Pomeranian development reference](../../../../index.md) / [lib-essential/src/content-editable](../../../../lib-essential/src/content-editable/index.md) / [ContentEditable](../../../../lib-essential/src/content-editable/classes/ContentEditable.md) / constructor

# Constructor: constructor()

# Constructor

> **new ContentEditable**\<`Root`\>(`context`, `target?`, `asRoot?`): [`ContentEditable`](../../../../lib-essential/src/content-editable/classes/ContentEditable.md)\<`Root`\>

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

[`ContentEditable`](../../../../lib-essential/src/content-editable/classes/ContentEditable.md)\<`Root`\>

## Remarks

Changed in @pomeranian/core@Unreleased: public constructor authoring enables
generic capability factories; supported construction still uses named factories.

## Since

Available since @pomeranian/core@Unreleased

## Inherited from

`Element.with( EditableValue, )<Root>.constructor`


## Context

Owner: [ContentEditable](../../../../lib-essential/src/content-editable/classes/ContentEditable.md).

## Owner type parameters

### Root

`Root` *extends* `UnboundRoot` = `UnboundRoot`


> **Unreleased @pomeranian/lib-essential API:** @pomeranian/lib-essential implementation from main; no npm release is implied.
