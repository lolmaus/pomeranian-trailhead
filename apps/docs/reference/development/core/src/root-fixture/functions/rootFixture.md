[Pomeranian development reference](../../../../index.md) / [core/src/root-fixture](../index.md) / rootFixture

# Function: rootFixture()

> **rootFixture**\<`C`\>(`Class`, ...`__namedParameters`): (`__namedParameters`, `use`) => `Promise`\<`void`\>

Defined in: [packages/core/src/root-fixture.ts:11](https://github.com/lolmaus/pomeranian-trailhead/blob/main/packages/core/src/root-fixture.ts#L11)

Create a designated application tree before child fields initialize.
Use the returned callback with Playwright Test's test.extend.

## Type Parameters

### C

`C` *extends* [`Class`](../../authoring/type-aliases/Class.md)

## Parameters

### Class

`C` & ([`Result`](../../authoring/type-aliases/Result.md)\<`C`\> *extends* [`Result`](../../authoring/type-aliases/Result.md)\<`C`\>\[`"root"`\] ? `unknown` : `never`)

### \_\_namedParameters

...[`Result`](../../authoring/type-aliases/Result.md)\<`C`\> *extends* [`DomPageObject`](../../dom-page-object/classes/DomPageObject.md)\<[`UnboundRoot`](../../authoring/type-aliases/UnboundRoot.md)\> ? \[`target?`: [`Target`](../../target/type-aliases/Target.md)\] : \[\]

## Returns

(`__namedParameters`, `use`) => `Promise`\<`void`\>

## Since

Available since @pomeranian/core@Unreleased


> **Unreleased core API:** @pomeranian/core implementation from main; no npm release is implied.
