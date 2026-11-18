[Pomeranian development reference](../../../../index.md) / [lib-essential/src/checkbox](../../../../lib-essential/src/checkbox/index.md) / [Checkbox](../../../../lib-essential/src/checkbox/classes/Checkbox.md) / constructor

# Constructor: constructor()

# Constructor

> **new Checkbox**\<`Root`\>(`context`, `target?`, `asRoot?`): [`Checkbox`](../../../../lib-essential/src/checkbox/classes/Checkbox.md)\<`Root`\>

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

[`Checkbox`](../../../../lib-essential/src/checkbox/classes/Checkbox.md)\<`Root`\>

## Remarks

Changed in @pomeranian/core@Unreleased: public constructor authoring enables
generic capability factories; supported construction still uses named factories.

## Since

Available since @pomeranian/core@Unreleased

## Inherited from

`Element.with( CheckableUncheckable, )<Root>.constructor`


## Context

Owner: [Checkbox](../../../../lib-essential/src/checkbox/classes/Checkbox.md).

## Owner type parameters

### Root

`Root` *extends* `UnboundRoot` = `UnboundRoot`


> **Unreleased @pomeranian/lib-essential API:** @pomeranian/lib-essential implementation from main; no npm release is implied.
