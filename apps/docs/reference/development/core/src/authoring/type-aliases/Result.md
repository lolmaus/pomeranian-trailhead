[Pomeranian development reference](../../../../index.md) / [core/src/authoring](../index.md) / Result

# Type Alias: Result\<C\>

> **Result**\<`C`\> = `Erased`\<`C`\[`"prototype"`\]\[*typeof* [`defaultInstanceType`](../variables/defaultInstanceType.md)\]\[`"parameters"`\]\> *extends* `true` ? `Default`\<`C`\[`"prototype"`\]\> *extends* `C`\[`"prototype"`\] ? `Default`\<`C`\[`"prototype"`\]\> : `never` : `C`\[`"prototype"`\]

Defined in: [packages/core/src/authoring.ts:42](https://github.com/lolmaus/pomeranian-trailhead/blob/main/packages/core/src/authoring.ts#L42)

Exact concrete or declared-default instance selected by an inherited factory.

## Type Parameters

### C

`C` *extends* [`Class`](Class.md)

## Since

Available since @pomeranian/core@Unreleased


> **Unreleased core API:** @pomeranian/core implementation from main; no npm release is implied.
