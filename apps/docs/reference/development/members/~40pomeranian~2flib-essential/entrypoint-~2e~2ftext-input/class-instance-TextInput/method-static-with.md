[Pomeranian development reference](../../../../index.md) / [lib-essential/src/text-input](../../../../lib-essential/src/text-input/index.md) / [TextInput](../../../../lib-essential/src/text-input/classes/TextInput.md) / with

# Method: with()

> `static` **with**\<`C`, `Added`\>(`this`, ...`capabilities`): `Compose`\<`C`, `Added`\>

Defined in: packages/core/dist/page-object.d.ts:45

Apply capabilities left to right through genuine subclass construction.
Each factory receives the preceding constructor; the receiver stays unchanged.
Name the returned class before using create or rootFixture.

## Type Parameters

### C

`C` *extends* `Constructor`\<`PageObject`\<`UnboundRoot`\>\>

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

## Inherited from

`Element.with( EditableText, ).with`


## Context

Owner: [TextInput](../../../../lib-essential/src/text-input/classes/TextInput.md).

## Owner type parameters

### Root

`Root` *extends* `UnboundRoot` = `UnboundRoot`


> **Unreleased @pomeranian/lib-essential API:** @pomeranian/lib-essential implementation from main; no npm release is implied.
