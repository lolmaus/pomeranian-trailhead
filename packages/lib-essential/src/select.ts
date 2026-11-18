import { Element } from "./element.js";
import { SelectableOptions } from "./selectable-options.js";
import { defaultInstanceType, type UnboundRoot } from "@pomeranian/core/authoring";
/** Native Select control with explicitly authored targets and inherited actions.
 * @since @pomeranian/lib-essential@Unreleased
 */
export class Select<Root extends UnboundRoot = UnboundRoot> extends Element.with(
  SelectableOptions,
)<Root> {
  /** Exact generic factory metadata. @since @pomeranian/lib-essential@Unreleased */
  declare readonly [defaultInstanceType]: { instance: Select; parameters: { root: Root } };
  /** Exact application association. @since @pomeranian/lib-essential@Unreleased */
  override get root(): Root {
    return super.root;
  }
}
