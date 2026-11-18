# Production authoring helper context

These declarations come directly from the production authoring and page-object modules. Constructor supports ordinary generic class factories; Compose, Before and Capabilities explain the accumulated-base tuple fold behind inherited with. Result reads the instance/default and complete independent parameter metadata through defaultInstanceType. RootReference defines the Page and nullable root structural boundary; UnboundRoot is RootReference | null. Internal helper names referenced by public factory signatures explain the computation; their appearance here does not create additional package exports. Read the [authoring guide](../guides/authoring.md) for supported conventions and compiler-only limits.

## Constructor

```ts
export type Constructor<Instance = object> = new (...args: any[]) => Instance;
```

## Class

```ts
export type Class = Function & { prototype: PageObject<UnboundRoot> };
```

## Default

```ts
type Default<I extends PageObject<UnboundRoot>> = I[typeof defaultInstanceType]["instance"];
```

## Equal

```ts
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
```

## Erased

```ts
type Erased<Args extends object> = true extends { [K in keyof Args]: IsAny<Args[K]> }[keyof Args]
  ? true
  : false;
```

## Result

```ts
export type Result<C extends Class> =
  Erased<C["prototype"][typeof defaultInstanceType]["parameters"]> extends true
    ? Default<C["prototype"]> extends C["prototype"]
      ? Default<C["prototype"]>
      : never
    : C["prototype"];
```

## IsAny

```ts
type IsAny<T> = 0 extends 1 & T ? true : false;
```

## Context

```ts
export type Context<Root extends UnboundRoot> =
  IsAny<Root> extends true ? never : null extends Root ? Page | PageObject<Root> : PageObject<Root>;
```

## TargetArguments

```ts
export type TargetArguments<Instance> =
  Instance extends DomPageObject<UnboundRoot>
    ? Instance extends { defaultTarget: Target }
      ? [target?: Target]
      : [target: Target]
    : [];
```

## Compose

```ts
type Compose<C, Added extends readonly unknown[]> = Added extends readonly [
  infer Head,
  ...infer Tail,
]
  ? Compose<Constructor<Head> & C, Tail>
  : C;
```

## Before

```ts
type Before<
  Added extends readonly unknown[],
  Index,
  Seen extends unknown[] = [],
> = `${Seen["length"]}` extends Index
  ? Seen
  : Added extends readonly [infer Head, ...infer Tail]
    ? Before<Tail, Index, [...Seen, Head]>
    : Seen;
```

## Capabilities

```ts
type Capabilities<C, Added extends readonly unknown[]> = {
  [K in keyof Added]: (
    base: Compose<C, Before<Added, K>>,
  ) => Constructor<Added[K]> & Compose<C, Before<Added, K>>;
};
```
