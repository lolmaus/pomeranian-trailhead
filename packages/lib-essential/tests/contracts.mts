import { Element, EditableValue, CheckableUncheckable, SelectableOptions } from "../src/index.js";
import { DomPageObject } from "@pomeranian/core";
import type { Locator, Page } from "playwright-core";
import { defaultInstanceType, type UnboundRoot } from "@pomeranian/core/authoring";
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
function equal<T extends true>(): T {
  return true as T;
}
class Button<Root extends UnboundRoot = UnboundRoot, Value = string> extends Element.with(
  EditableValue,
  CheckableUncheckable,
  SelectableOptions,
)<Root> {
  declare readonly [defaultInstanceType]: {
    instance: Button;
    parameters: { root: Root; value: Value };
  };
  override get root(): Root {
    return super.root;
  }
  override defaultTarget = "button";
  value: Value | undefined;
}
class App extends DomPageObject<App> {
  appOnly = true;
}
export function contracts(page: Page, app: App) {
  const plain = Element.create(page, "button");
  equal<Equal<typeof plain, Element>>();
  const library = Button.create(page);
  equal<Equal<typeof library, Button>>();
  class Bound extends Button<App, number> {}
  const bound = Bound.create(app);
  equal<Equal<typeof bound, Bound>>();
  equal<Equal<typeof bound.root, App>>();
  equal<Equal<typeof plain.click, Locator["click"]>>();
  equal<Equal<typeof plain.dblclick, Locator["dblclick"]>>();
  equal<Equal<typeof plain.hover, Locator["hover"]>>();
  equal<Equal<typeof plain.focus, Locator["focus"]>>();
  equal<Equal<typeof plain.blur, Locator["blur"]>>();
  equal<Equal<typeof plain.press, Locator["press"]>>();
  equal<Equal<typeof plain.pressSequentially, Locator["pressSequentially"]>>();
  equal<Equal<typeof plain.type, Locator["type"]>>();
  equal<Equal<typeof library.fill, Locator["fill"]>>();
  equal<Equal<typeof bound.fill, Locator["fill"]>>();
  equal<Equal<typeof library.clear, Locator["clear"]>>();
  equal<Equal<typeof bound.clear, Locator["clear"]>>();
  equal<Equal<typeof library.check, Locator["check"]>>();
  equal<Equal<typeof bound.check, Locator["check"]>>();
  equal<Equal<typeof library.uncheck, Locator["uncheck"]>>();
  equal<Equal<typeof bound.uncheck, Locator["uncheck"]>>();
  equal<Equal<typeof library.setChecked, Locator["setChecked"]>>();
  equal<Equal<typeof bound.setChecked, Locator["setChecked"]>>();
  equal<Equal<typeof library.selectOption, Locator["selectOption"]>>();
  equal<Equal<typeof bound.selectOption, Locator["selectOption"]>>();
  equal<Equal<typeof plain.selectText, Locator["selectText"]>>();
  equal<Equal<typeof bound.selectText, Locator["selectText"]>>();
  // Technically accessible; direct construction remains unsupported.
  new Element(page, "button");
  // @ts-expect-error required target
  Element.create(page);
  // @ts-expect-error native keyboard argument required
  plain.press();
  // @ts-expect-error native option value
  plain.click({ button: "sideways" });
}
/** Supported minimum and current pin inventory. Every key is checked against native Locator. */
export const interactionOwners = {
  click: 34,
  dblclick: 34,
  hover: 34,
  focus: 34,
  blur: 34,
  press: 34,
  pressSequentially: 34,
  type: 34,
  check: 35,
  clear: 35,
  fill: 35,
  selectOption: 35,
  selectText: 35,
  setChecked: 35,
  uncheck: 35,
  dispatchEvent: 36,
  dragTo: 36,
  scrollIntoViewIfNeeded: 36,
  setInputFiles: 36,
  tap: 36,
} satisfies Partial<Record<Exclude<keyof Locator, "toString">, number>>;

import {
  TextInput,
  TextArea,
  Checkbox,
  Radio,
  Select,
  ContentEditable,
  Fillable,
  Checkable,
} from "../src/index.js";
import { PageObject, checkLibrary, rootFixture } from "@pomeranian/core";
export function controlContracts(page: Page, app: App) {
  const text = TextInput.create(page, "input");
  const area = TextArea.create(page, "textarea");
  const checkbox = Checkbox.create(page, "input");
  const radio = Radio.create(page, "input");
  const select = Select.create(page, "select");
  const editable = ContentEditable.create(page, "div");
  equal<Equal<typeof text, TextInput>>();
  equal<Equal<typeof area, TextArea>>();
  equal<Equal<typeof checkbox, Checkbox>>();
  equal<Equal<typeof radio, Radio>>();
  equal<Equal<typeof select, Select>>();
  equal<Equal<typeof editable, ContentEditable>>();
  equal<Equal<typeof text.fill, Locator["fill"]>>();
  equal<Equal<typeof area.clear, Locator["clear"]>>();
  equal<Equal<typeof checkbox.setChecked, Locator["setChecked"]>>();
  equal<Equal<typeof radio.check, Locator["check"]>>();
  equal<Equal<typeof select.selectOption, Locator["selectOption"]>>();
  equal<Equal<typeof editable.clear, Locator["clear"]>>();
  class BoundText extends TextInput<App> {
    override defaultTarget = "input";
  }
  const bound = BoundText.create(app);
  equal<Equal<typeof bound, BoundText>>();
  equal<Equal<typeof bound.root, App>>();
  class Nullable extends TextArea<App | null> {
    override defaultTarget = "textarea";
  }
  const nullable = Nullable.create(page);
  equal<Equal<typeof nullable.root, App | null>>();
  class Alone extends ContentEditable<null> {
    override defaultTarget = "div";
  }
  const alone = Alone.create(page);
  equal<Equal<typeof alone.root, null>>();
  class Custom extends DomPageObject {
    component = true;
  }
  class Independent extends Custom.with(Fillable) {}
  Independent.create(page, "input").fill("x");
  class Checked extends DomPageObject.with(Checkable) {}
  Checked.create(page, "input").check();
  checkLibrary<TextInput>()(TextInput);
  checkLibrary<TextArea>()(TextArea);
  checkLibrary<Checkbox>()(Checkbox);
  checkLibrary<Radio>()(Radio);
  checkLibrary<Select>()(Select);
  checkLibrary<ContentEditable>()(ContentEditable);
  // @ts-expect-error Grouping bases lack Locator.
  PageObject.with(Fillable);
  // @ts-expect-error Grouping bases lack Locator.
  PageObject.with(EditableValue);
  // @ts-expect-error Grouping bases lack Locator.
  PageObject.with(Checkable);
  // @ts-expect-error Grouping bases lack Locator.
  PageObject.with(CheckableUncheckable);
  // @ts-expect-error Grouping bases lack Locator.
  PageObject.with(SelectableOptions);
  // @ts-expect-error Root-bound control rejects unrooted page.
  BoundText.create(page);
  // @ts-expect-error Target remains required.
  TextInput.create(page);
  // @ts-expect-error Radio is check-only.
  radio.uncheck();
  // @ts-expect-error Radio is check-only.
  radio.setChecked(false);
  // @ts-expect-error Contenteditable has no append contract.
  editable.appendText("x");
  // @ts-expect-error Element does not expose control mutations.
  Element.create(page, "input").fill("x");
  class ControlRoot extends TextInput<ControlRoot> {
    override defaultTarget = "input";
    app = true;
  }
  rootFixture(ControlRoot);
  return [text, area, checkbox, radio, select, editable];
}

import { EditableText } from "../src/index.js";
export function appendContracts(page: Page, app: App) {
  const text = TextInput.create(page, "input");
  equal<Equal<typeof text.appendText, Locator["fill"]>>();
  equal<Equal<typeof TextArea.prototype.appendText, Locator["fill"]>>();
  class Custom extends DomPageObject.with(EditableText) {}
  const custom = Custom.create(page, "input");
  equal<Equal<typeof custom.appendText, Locator["fill"]>>();
  class Field<
    Root extends UnboundRoot = UnboundRoot,
    Value = string,
    Extra = boolean,
  > extends TextInput<Root> {
    declare readonly [defaultInstanceType]: {
      instance: Field;
      parameters: { root: Root; value: Value; extra: Extra };
    };
    override get root(): Root {
      return super.root;
    }
    override defaultTarget = "input";
    value: Value | undefined;
    extra: Extra | undefined;
  }
  class Bound extends Field<App, number, Date> {}
  const bound = Bound.create(app);
  equal<Equal<typeof bound, Bound>>();
  equal<Equal<typeof bound.value, number | undefined>>();
  equal<Equal<typeof bound.extra, Date | undefined>>();
  // @ts-expect-error append requires text
  text.appendText();
  // @ts-expect-error append accepts string only
  text.appendText(123);
  // @ts-expect-error native options only
  text.appendText("x", { keyboard: true });
  // @ts-expect-error grouping bases lack Locator
  PageObject.with(EditableText);
}
