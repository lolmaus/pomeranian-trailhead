# Explore the factory-typing proof

::: warning Prototype, not a supported package
Everything in `packages/core/prototypes/factory-typing` is a bounded experiment. Its source rules and compiler checks are required together. It is not a production implementation of `@pomeranian/core`, and its string-target and constructor restrictions must not be generalized into future API promises.
:::

Run the complete proof from the repository root:

```sh
node packages/core/prototypes/factory-typing/run.mjs
```

Use `--types-only` for its source-authoring regressions and strict TypeScript checks without Chromium. The full runner also exercises the approved and deliberately unsafe counterexamples in real Chromium. Read [the authoritative proof README](https://github.com/lolmaus/pomeranian-trailhead/tree/main/packages/core/prototypes/factory-typing) before changing its classes.

## A checked direct-library example

This maintained consumer imports the actual prototype API. It introduces no new library-author classes. It is checked with the prototype's strict configuration and TypeScript 7, while the original source-rule runner continues to enforce the owning class modules.

<!-- @example examples/prototype.spec.mts#prototype -->

The returned root is nullable when constructed directly from a Playwright Page. A concrete application-bound subclass has a different context contract. This example does not settle future production action names or full target semantics.

## Helper context

The protected constructor and inherited factory rely on conditional helper types. [Source-derived helper declarations](../reference/prototype-helpers.md) explain `Class`, `Context`, `Result`, `TargetArguments`, and their dependencies without flattening them into misleading anonymous types. Their declarations remain owned by the prototype source.

## Accepted TypeDoc limitation

[TypeDoc #3148](https://github.com/TypeStrong/typedoc/issues/3148) is an accepted, unfixed limitation. An inherited generic getter on a concrete consumer subclass can display unresolved `Root` even when TypeScript proves its concrete type. The corresponding ordinary method specializes correctly in the retained regression.

The documentation gate was accepted for exported library classes that retain generic root parameters. Concrete application-root bindings belong to consumer subclasses. The regression suite retains both the minimal original case and the original `App`, `null`, and `App | null` evidence. A passing generation/build does not claim this bug is fixed. See [the accepted compatibility resolution](https://github.com/lolmaus/pomeranian-trailhead/issues/13#issuecomment-6532733299).
