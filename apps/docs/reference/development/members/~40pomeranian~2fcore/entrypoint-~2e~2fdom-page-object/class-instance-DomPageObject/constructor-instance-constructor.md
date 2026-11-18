[Pomeranian development reference](../../../../index.md) / [core/src/dom-page-object](../../../../core/src/dom-page-object/index.md) / [DomPageObject](../../../../core/src/dom-page-object/classes/DomPageObject.md) / constructor

# Constructor: constructor()

# Constructor

> **new DomPageObject**\<`Root`\>(`context`, `target?`, `asRoot?`): [`DomPageObject`](../../../../core/src/dom-page-object/classes/DomPageObject.md)\<`Root`\>

Defined in: [packages/core/src/dom-page-object.ts:28](https://github.com/lolmaus/pomeranian-trailhead/blob/main/packages/core/src/dom-page-object.ts#L28)

Technically public for capabilities; construct through named create/rootFixture.
Inherit the constructor; defaults are captured after subclass fields complete.

## Parameters

### context

`Page` \| [`PageObject`](../../../../core/src/page-object/classes/PageObject.md)\<`Root`\>

### target?

[`Target`](../../../../core/src/target/type-aliases/Target.md)

### asRoot?

`boolean` = `false`

## Returns

[`DomPageObject`](../../../../core/src/dom-page-object/classes/DomPageObject.md)\<`Root`\>

## Remarks

Changed in @pomeranian/core@Unreleased: public constructor authoring enables
generic capability factories; supported construction still uses named factories.

## Since

Available since @pomeranian/core@Unreleased

## Overrides

[`PageObject`](../../../../core/src/page-object/classes/PageObject.md).[`constructor`](../../entrypoint-~2e~2fpage-object/class-instance-PageObject/constructor-instance-constructor.md)


## Context

Owner: [DomPageObject](../../../../core/src/dom-page-object/classes/DomPageObject.md).

## Owner type parameters

### Root

`Root` *extends* [`UnboundRoot`](../../../../core/src/authoring/type-aliases/UnboundRoot.md) = [`UnboundRoot`](../../../../core/src/authoring/type-aliases/UnboundRoot.md)


> **Unreleased core API:** @pomeranian/core implementation from main; no npm release is implied.
