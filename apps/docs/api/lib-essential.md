# @pomeranian/lib-essential

Status: implemented Unreleased basic and form interactions, locally buildable and packable. No npm publication exists.

`Element<Root>` extends core `DomPageObject<Root>` and inherits its exact factories, protected construction, grouping, application roots and explicit target/defaultTarget authoring. It adds `click`, `dblclick`, `hover`, `focus`, `blur`, `press`, `pressSequentially` and deprecated `type`, with native arguments, options, results, waits and errors. Use `pressSequentially` for keyboard input or `fill` for replacement. Form actions `fill`, `clear`, `check`, `uncheck`, `setChecked`, `selectOption` and `selectText` are also implemented with complete native contracts. Native fill includes textarea, contenteditable and supported structured inputs. Checkable controls retain native radio and label behavior. `selectOption` returns `Promise<string[]>`; routine tests may ignore the result. These are complete actions; deliberate raw observations remain on `.locator`.

<!-- @example examples/essential.spec.mts#essential -->

Both `@pomeranian/lib-essential` and `@pomeranian/lib-essential/element` export the same class across ESM and CommonJS. Build core and essential before packing; consumers install both tarballs and aligned playwright-core/native runner or standalone playwright versions. No automatic selector discovery or broad default selector is introduced.

The [approved milestone](../guides/essential-milestone.md) tracks remaining other interactions (#36) and TextInput.appendText (#37). These later APIs are not implemented. Assertion organization and public narrowing remain separate work.

Available since @pomeranian/lib-essential@Unreleased.

Inherited construction and target APIs: Available since @pomeranian/core@Unreleased.

<!-- @example examples/essential.spec.mts#forms -->
