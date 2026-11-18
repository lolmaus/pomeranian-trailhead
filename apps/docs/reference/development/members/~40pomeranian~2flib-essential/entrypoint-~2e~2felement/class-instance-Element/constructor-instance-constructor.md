[Pomeranian development reference](../../../../index.md) / [lib-essential/src/element](../../../../lib-essential/src/element/index.md) / [Element](../../../../lib-essential/src/element/classes/Element.md) / constructor

# Constructor: constructor()

# Constructor

> **new Element**\<`Root`\>(`context`, `target?`, `asRoot?`): [`Element`](../../../../lib-essential/src/element/classes/Element.md)\<`Root`\>

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

[`Element`](../../../../lib-essential/src/element/classes/Element.md)\<`Root`\>

## Remarks

Changed in @pomeranian/core@Unreleased: public constructor authoring enables
generic capability factories; supported construction still uses named factories.

## Since

Available since @pomeranian/core@Unreleased

## Inherited from

`DomPageObject<Root>.constructor`


## Context

Owner: [Element](../../../../lib-essential/src/element/classes/Element.md).

## Owner type parameters

### Root

`Root` *extends* `UnboundRoot` = `UnboundRoot`


> **Unreleased @pomeranian/lib-essential API:** @pomeranian/lib-essential implementation from main; no npm release is implied.
