[Pomeranian development reference](../../../../index.md) / [core/src/page-object](../../../../core/src/page-object/index.md) / [PageObject](../../../../core/src/page-object/classes/PageObject.md) / constructor

# Constructor: constructor()

# Constructor

> **new PageObject**\<`Root`\>(`context`, `target?`, `asRoot?`): [`PageObject`](../../../../core/src/page-object/classes/PageObject.md)\<`Root`\>

Defined in: [packages/core/src/page-object.ts:49](https://github.com/lolmaus/pomeranian-trailhead/blob/main/packages/core/src/page-object.ts#L49)

Technically public for class-factory capabilities; direct new is unsupported.
Inherit this constructor and initialize state in ordinary fields.

## Parameters

### context

`Page` \| [`PageObject`](../../../../core/src/page-object/classes/PageObject.md)\<`Root`\>

### target?

[`Target`](../../../../core/src/target/type-aliases/Target.md)

### asRoot?

`boolean` = `false`

## Returns

[`PageObject`](../../../../core/src/page-object/classes/PageObject.md)\<`Root`\>

## Remarks

Changed in @pomeranian/core@Unreleased: public constructor authoring enables
generic capability factories; supported construction still uses named factories.

## Since

Available since @pomeranian/core@Unreleased


## Context

Owner: [PageObject](../../../../core/src/page-object/classes/PageObject.md).

## Owner type parameters

### Root

`Root` *extends* [`UnboundRoot`](../../../../core/src/authoring/type-aliases/UnboundRoot.md) = [`UnboundRoot`](../../../../core/src/authoring/type-aliases/UnboundRoot.md)


> **Unreleased core API:** @pomeranian/core implementation from main; no npm release is implied.
