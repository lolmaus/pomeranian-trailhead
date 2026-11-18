[Pomeranian development reference](../../../../index.md) / [core/src/authoring](../index.md) / Context

# Type Alias: Context\<Root\>

> **Context**\<`Root`\> = `IsAny`\<`Root`\> *extends* `true` ? `never` : `null` *extends* `Root` ? `Page` \| [`PageObject`](../../page-object/classes/PageObject.md)\<`Root`\> : [`PageObject`](../../page-object/classes/PageObject.md)\<`Root`\>

Defined in: [packages/core/src/authoring.ts:52](https://github.com/lolmaus/pomeranian-trailhead/blob/main/packages/core/src/authoring.ts#L52)

Compatible parent context; Page is accepted only when the root may be null.

## Type Parameters

### Root

`Root` *extends* [`UnboundRoot`](UnboundRoot.md)

## Since

Available since @pomeranian/core@Unreleased


> **Unreleased core API:** @pomeranian/core implementation from main; no npm release is implied.
