import { DomPageObject } from "@pomeranian/core/dom-page-object";
import { defaultInstanceType, type UnboundRoot } from "@pomeranian/core/authoring";
/** A DOM element with native Playwright interactions.
 * @since @pomeranian/lib-essential@Unreleased
 */
export class Element<Root extends UnboundRoot = UnboundRoot> extends DomPageObject<Root> {
  /** Generic factory metadata.
   * @since @pomeranian/lib-essential@Unreleased
   */
  declare readonly [defaultInstanceType]: { instance: Element; parameters: { root: Root } };
}
