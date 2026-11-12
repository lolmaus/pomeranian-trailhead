import type { Page, Locator } from "playwright-core";
/** Named native inputs for a synchronous Locator factory.
 * @since @pomeranian/core@Unreleased
 */
export type LocatorFactoryContext = Readonly<{ page: Page; scope: Locator | null }>;
/** Resolve a live Locator without querying elements or performing side effects.
 * @since @pomeranian/core@Unreleased
 */
export type LocatorFactory = (context: LocatorFactoryContext) => Locator;
/** One CSS body, an explicit Locator, or a synchronous Locator factory.
 * @since @pomeranian/core@Unreleased
 */
export type Target = string | Locator | LocatorFactory;
