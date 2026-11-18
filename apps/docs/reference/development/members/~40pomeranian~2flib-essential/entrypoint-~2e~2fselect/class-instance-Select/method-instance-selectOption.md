[Pomeranian development reference](../../../../index.md) / [lib-essential/src/select](../../../../lib-essential/src/select/index.md) / [Select](../../../../lib-essential/src/select/classes/Select.md) / selectOption

# Method: selectOption()

> **selectOption**(...`args`): `Promise`\<`string`[]\>

Defined in: [packages/lib-essential/src/selectable-options.ts:12](https://github.com/lolmaus/pomeranian-trailhead/blob/main/packages/lib-essential/src/selectable-options.ts#L12)

Complete native selectOption action, retaining applicability, options, waiting and errors.
Returns the native selected option values; routine tests may ignore them.

## Parameters

### args

...\[`values`: `string` \| readonly `string`[] \| `ElementHandle`\<`Node`\> \| readonly `ElementHandle`\<`Node`\>[] \| \{ `index?`: `number`; `label?`: `string`; `value?`: `string`; \} \| readonly `object`[] \| `null`, `options?`: `object`\]

## Returns

`Promise`\<`string`[]\>

## Since

Available since @pomeranian/lib-essential@Unreleased

## Inherited from

`Element.with( SelectableOptions, ).selectOption`


## Context

Owner: [Select](../../../../lib-essential/src/select/classes/Select.md).

## Owner type parameters

### Root

`Root` *extends* `UnboundRoot` = `UnboundRoot`


> **Unreleased @pomeranian/lib-essential API:** @pomeranian/lib-essential implementation from main; no npm release is implied.
