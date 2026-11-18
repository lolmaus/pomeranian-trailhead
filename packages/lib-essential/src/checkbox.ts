import { Element } from "./element.js";
import { CheckableUncheckable } from "./checkable-uncheckable.js";
import { defaultInstanceType, type UnboundRoot } from "@pomeranian/core/authoring";
/** Native Checkbox control with explicitly authored targets and inherited actions.
 * @since @pomeranian/lib-essential@Unreleased
 */
export class Checkbox<Root extends UnboundRoot = UnboundRoot> extends Element.with(
  CheckableUncheckable,
)<Root> {
  /** Exact generic factory metadata. @since @pomeranian/lib-essential@Unreleased */
  declare readonly [defaultInstanceType]: { instance: Checkbox; parameters: { root: Root } };
  /** Exact application association. @since @pomeranian/lib-essential@Unreleased */
  override get root(): Root {
    return super.root;
  }
}
