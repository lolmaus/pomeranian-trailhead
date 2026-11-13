import { Element } from "../src/element.js";
import { DomPageObject } from "@pomeranian/core";
import type { Locator, Page } from "playwright-core";
import { defaultInstanceType, type UnboundRoot } from "@pomeranian/core/authoring";
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
function equal<T extends true>(): T {
  return true as T;
}
class Button<Root extends UnboundRoot = UnboundRoot, Value = string> extends Element<Root> {
  declare readonly [defaultInstanceType]: {
    instance: Button;
    parameters: { root: Root; value: Value };
  };
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
  equal<Equal<typeof plain.fill, Locator["fill"]>>();
  equal<Equal<typeof bound.fill, Locator["fill"]>>();
  equal<Equal<typeof plain.clear, Locator["clear"]>>();
  equal<Equal<typeof bound.clear, Locator["clear"]>>();
  equal<Equal<typeof plain.check, Locator["check"]>>();
  equal<Equal<typeof bound.check, Locator["check"]>>();
  equal<Equal<typeof plain.uncheck, Locator["uncheck"]>>();
  equal<Equal<typeof bound.uncheck, Locator["uncheck"]>>();
  equal<Equal<typeof plain.setChecked, Locator["setChecked"]>>();
  equal<Equal<typeof bound.setChecked, Locator["setChecked"]>>();
  equal<Equal<typeof plain.selectOption, Locator["selectOption"]>>();
  equal<Equal<typeof bound.selectOption, Locator["selectOption"]>>();
  equal<Equal<typeof plain.selectText, Locator["selectText"]>>();
  equal<Equal<typeof bound.selectText, Locator["selectText"]>>();
  // @ts-expect-error protected lifecycle
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
