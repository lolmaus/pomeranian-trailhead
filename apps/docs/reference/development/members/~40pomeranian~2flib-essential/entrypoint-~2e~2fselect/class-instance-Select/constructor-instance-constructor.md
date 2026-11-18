[Pomeranian development reference](../../../../index.md) / [lib-essential/src/select](../../../../lib-essential/src/select/index.md) / [Select](../../../../lib-essential/src/select/classes/Select.md) / constructor

# Constructor: constructor()

# Constructor

> **new Select**\<`Root`\>(`context`, `target?`, `asRoot?`): [`Select`](../../../../lib-essential/src/select/classes/Select.md)\<`Root`\>

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

[`Select`](../../../../lib-essential/src/select/classes/Select.md)\<`Root`\>

## Remarks

Changed in @pomeranian/core@Unreleased: public constructor authoring enables
generic capability factories; supported construction still uses named factories.

## Since

Available since @pomeranian/core@Unreleased

## Inherited from

`Element.with( SelectableOptions, )<Root>.constructor`


## Context

Owner: [Select](../../../../lib-essential/src/select/classes/Select.md).

## Owner type parameters

### Root

`Root` *extends* `UnboundRoot` = `UnboundRoot`


> **Unreleased @pomeranian/lib-essential API:** @pomeranian/lib-essential implementation from main; no npm release is implied.
