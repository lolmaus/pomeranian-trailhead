[Pomeranian development reference](../../../../index.md) / [lib-essential/src/text-input](../../../../lib-essential/src/text-input/index.md) / [TextInput](../../../../lib-essential/src/text-input/classes/TextInput.md) / type

# ~~Method: type()~~

> **type**(...`args`): `Promise`\<`void`\>

Defined in: [packages/lib-essential/src/element.ts:61](https://github.com/lolmaus/pomeranian-trailhead/blob/main/packages/lib-essential/src/element.ts#L61)

Perform native type, retaining Playwright waiting, options and errors.

## Parameters

### args

...\[`text`: `string`, `options?`: `object`\]

## Returns

`Promise`\<`void`\>

## Deprecated

Use fill for replacement or pressSequentially for keyboard input.

## Since

Available since @pomeranian/lib-essential@Unreleased

## Inherited from

`Element.with( EditableText, ).type`


## Context

Owner: [TextInput](../../../../lib-essential/src/text-input/classes/TextInput.md).

## Owner type parameters

### Root

`Root` *extends* `UnboundRoot` = `UnboundRoot`


> **Unreleased @pomeranian/lib-essential API:** @pomeranian/lib-essential implementation from main; no npm release is implied.
