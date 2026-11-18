[Pomeranian development reference](../../../../index.md) / [core/src/page-object](../../../../core/src/page-object/index.md) / [PageObject](../../../../core/src/page-object/classes/PageObject.md) / create

# Method: create()

> `static` **create**\<`C`\>(`this`, `context`, ...`__namedParameters`): [`Result`](../../../../core/src/authoring/type-aliases/Result.md)\<`C`\>

Defined in: [packages/core/src/page-object.ts:95](https://github.com/lolmaus/pomeranian-trailhead/blob/main/packages/core/src/page-object.ts#L95)

Construct a fresh concrete instance with ordinary field initialization.

## Type Parameters

### C

`C` *extends* [`Class`](../../../../core/src/authoring/type-aliases/Class.md)

## Parameters

### this

`C`

### context

[`Context`](../../../../core/src/authoring/type-aliases/Context.md)\<[`Result`](../../../../core/src/authoring/type-aliases/Result.md)\<`C`\>\[`"root"`\]\>

### \_\_namedParameters

...[`TargetArguments`](../../../../core/src/authoring/type-aliases/TargetArguments.md)\<[`Result`](../../../../core/src/authoring/type-aliases/Result.md)\<`C`\>\>

## Returns

[`Result`](../../../../core/src/authoring/type-aliases/Result.md)\<`C`\>

## Since

Available since @pomeranian/core@Unreleased


## Context

Owner: [PageObject](../../../../core/src/page-object/classes/PageObject.md).

## Owner type parameters

### Root

`Root` *extends* [`UnboundRoot`](../../../../core/src/authoring/type-aliases/UnboundRoot.md) = [`UnboundRoot`](../../../../core/src/authoring/type-aliases/UnboundRoot.md)


> **Unreleased core API:** @pomeranian/core implementation from main; no npm release is implied.
