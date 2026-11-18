[Pomeranian development reference](../../../../index.md) / [lib-essential/src/element](../../../../lib-essential/src/element/index.md) / [Element](../../../../lib-essential/src/element/classes/Element.md) / locator

# Accessor: locator

## Get Signature

> **get** **locator**(): `Locator`

Defined in: packages/core/dist/dom-page-object.d.ts:36

A live native query, memoized only after successful validation.
Access rejects while this object or an ancestor initializes. Factory, result,
ownership and cycle failures leave the query retryable. Native operations
determine DOM existence, cardinality and full CSS grammar validity.

### Since

Available since @pomeranian/core@Unreleased

### Returns

`Locator`

## Inherited from

`DomPageObject.locator`


## Context

Owner: [Element](../../../../lib-essential/src/element/classes/Element.md).

## Owner type parameters

### Root

`Root` *extends* `UnboundRoot` = `UnboundRoot`


> **Unreleased @pomeranian/lib-essential API:** @pomeranian/lib-essential implementation from main; no npm release is implied.
