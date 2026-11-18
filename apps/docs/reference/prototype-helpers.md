# Prototype factory helper context

These source-derived declarations are experimental evidence, not supported production APIs. They come from [the owning factory proof](https://github.com/lolmaus/pomeranian-trailhead/blob/main/packages/core/prototypes/factory-typing/probe.mts). Read the [factory guide](../guides/factory-proof.md) for the checked authoring restrictions and accepted TypeDoc limitation.

`Class` describes the constructor receiver without inventing a public construct signature. `Result` selects the declared default instance for erased generic parameters. `Context` permits a Page only for nullable roots. `TargetArguments` distinguishes grouping, default-target and explicit-target construction. The remaining helpers explain that computation. PageObject, DomPageObject, RootReference and the metadata symbol are declared in the linked owning source. No blanket inline expansion or hidden TypeDoc diagnostic is used.

## Class

```ts
type Class = Function & { prototype: PageObject<UnboundRoot> };
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
type Context<Root extends UnboundRoot> =
  IsAny<Root> extends true ? never : null extends Root ? Page | PageObject<Root> : PageObject<Root>;
```

## TargetArguments

```ts
type TargetArguments<Instance> =
  Instance extends DomPageObject<UnboundRoot>
    ? Instance extends { defaultTarget: string }
      ? [target?: string]
      : [target: string]
    : [];
```
