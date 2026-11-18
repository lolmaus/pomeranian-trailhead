[Pomeranian development reference](../../../../index.md) / [core/src/page-object](../../../../core/src/page-object/index.md) / [PageObject](../../../../core/src/page-object/classes/PageObject.md) / with

# Method: with()

> `static` **with**\<`C`, `Added`\>(`this`, ...`capabilities`): `Compose`\<`C`, `Added`\>

Defined in: [packages/core/src/page-object.ts:78](https://github.com/lolmaus/pomeranian-trailhead/blob/main/packages/core/src/page-object.ts#L78)

Apply capabilities left to right through genuine subclass construction.
Each factory receives the preceding constructor; the receiver stays unchanged.
Name the returned class before using create or rootFixture.

## Type Parameters

### C

`C` *extends* [`Constructor`](../../../../core/src/authoring/type-aliases/Constructor.md)\<[`PageObject`](../../../../core/src/page-object/classes/PageObject.md)\<[`UnboundRoot`](../../../../core/src/authoring/type-aliases/UnboundRoot.md)\>\>

### Added

`Added` *extends* readonly `unknown`[]

## Parameters

### this

`C`

### capabilities

...`Capabilities`\<`C`, `Added`\>

## Returns

`Compose`\<`C`, `Added`\>

## Since

Available since @pomeranian/core@Unreleased


## Context

Owner: [PageObject](../../../../core/src/page-object/classes/PageObject.md).

## Owner type parameters

### Root

`Root` *extends* [`UnboundRoot`](../../../../core/src/authoring/type-aliases/UnboundRoot.md) = [`UnboundRoot`](../../../../core/src/authoring/type-aliases/UnboundRoot.md)


> **Unreleased core API:** @pomeranian/core implementation from main; no npm release is implied.
