# Throwaway narrowing/reconstruction proof (#11)

This experiment tests the developing decision in
[typed narrowing and instance reconstruction (#11)](https://github.com/lolmaus/pomeranian-trailhead/issues/11).
It is not production core, has no package manifest or exports, and settles no
additional public API until the author confirms the complete contract.

Run with installed workspace dependencies and Chromium:

```sh
node packages/core/prototypes/narrowing/run.mjs
```

`--types-only` omits Chromium. The runner installs nothing, copies sources to
temporary storage, and retains failures for inspection. Factory and target
machinery is borrowed from the separately bounded #9/#10 proofs. This experiment
does not replace or broaden #9's authoring-source enforcement.

The agreed starting point is a new concrete instance with a derived target,
ordinary field/private-state initialization, fresh children, and the initial
first/last/nth/filter surface. Convenience APIs have their own decision (#19).
