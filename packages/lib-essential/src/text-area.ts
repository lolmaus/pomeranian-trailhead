import { Element } from "./element.js";
import { EditableValue } from "./editable-value.js";
import { defaultInstanceType, type UnboundRoot } from "@pomeranian/core/authoring";
/** Native TextArea control with explicitly authored targets and inherited actions.
 * @since @pomeranian/lib-essential@Unreleased
 */
export class TextArea<Root extends UnboundRoot = UnboundRoot> extends Element.with(
  EditableValue,
)<Root> {
  /** Exact generic factory metadata. @since @pomeranian/lib-essential@Unreleased */
  declare readonly [defaultInstanceType]: { instance: TextArea; parameters: { root: Root } };
  /** Exact application association. @since @pomeranian/lib-essential@Unreleased */
  override get root(): Root {
    return super.root;
  }
}
