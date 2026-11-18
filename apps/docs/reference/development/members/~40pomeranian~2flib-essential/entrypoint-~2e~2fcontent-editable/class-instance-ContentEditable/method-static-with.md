[Pomeranian development reference](../../../../index.md) / [lib-essential/src/content-editable](../../../../lib-essential/src/content-editable/index.md) / [ContentEditable](../../../../lib-essential/src/content-editable/classes/ContentEditable.md) / with

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

`Element.with( EditableValue, ).with`


## Context

Owner: [ContentEditable](../../../../lib-essential/src/content-editable/classes/ContentEditable.md).

## Owner type parameters

### Root

`Root` *extends* `UnboundRoot` = `UnboundRoot`


> **Unreleased @pomeranian/lib-essential API:** @pomeranian/lib-essential implementation from main; no npm release is implied.
