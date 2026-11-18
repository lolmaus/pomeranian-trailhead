import { Element } from "./element.js";
import { Checkable } from "./checkable.js";
import { defaultInstanceType, type UnboundRoot } from "@pomeranian/core/authoring";
/** Native Radio control with explicitly authored targets and inherited actions.
 * @since @pomeranian/lib-essential@Unreleased
 */
export class Radio<Root extends UnboundRoot = UnboundRoot> extends Element.with(Checkable)<Root> {
  /** Exact generic factory metadata. @since @pomeranian/lib-essential@Unreleased */
  declare readonly [defaultInstanceType]: { instance: Radio; parameters: { root: Root } };
  /** Exact application association. @since @pomeranian/lib-essential@Unreleased */
  override get root(): Root {
    return super.root;
  }
}
