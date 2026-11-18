[Pomeranian development reference](../../../../index.md) / [core/src/dom-page-object](../../../../core/src/dom-page-object/index.md) / [DomPageObject](../../../../core/src/dom-page-object/classes/DomPageObject.md) / locator

# Accessor: locator

## Get Signature

> **get** **locator**(): `Locator`

Defined in: [packages/core/src/dom-page-object.ts:58](https://github.com/lolmaus/pomeranian-trailhead/blob/main/packages/core/src/dom-page-object.ts#L58)

A live native query, memoized only after successful validation.
Access rejects while this object or an ancestor initializes. Factory, result,
ownership and cycle failures leave the query retryable. Native operations
determine DOM existence, cardinality and full CSS grammar validity.

### Since

Available since @pomeranian/core@Unreleased

### Returns

`Locator`


## Context

Owner: [DomPageObject](../../../../core/src/dom-page-object/classes/DomPageObject.md).

## Owner type parameters

### Root

`Root` *extends* [`UnboundRoot`](../../../../core/src/authoring/type-aliases/UnboundRoot.md) = [`UnboundRoot`](../../../../core/src/authoring/type-aliases/UnboundRoot.md)


> **Unreleased core API:** @pomeranian/core implementation from main; no npm release is implied.
