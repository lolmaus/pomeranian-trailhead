import { Element } from "./element.js";
import { EditableText } from "./editable-text.js";
import { defaultInstanceType, type UnboundRoot } from "@pomeranian/core/authoring";
/** Native TextInput control with explicitly authored targets and inherited actions.
 * @since @pomeranian/lib-essential@Unreleased
 */
export class TextInput<Root extends UnboundRoot = UnboundRoot> extends Element.with(
  EditableText,
)<Root> {
  /** Exact generic factory metadata. @since @pomeranian/lib-essential@Unreleased */
  declare readonly [defaultInstanceType]: { instance: TextInput; parameters: { root: Root } };
  /** Exact application association. @since @pomeranian/lib-essential@Unreleased */
  override get root(): Root {
    return super.root;
  }
}
