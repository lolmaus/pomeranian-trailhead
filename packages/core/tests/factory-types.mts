import type { Page } from "playwright-core";
import { PageObject } from "../src/page-object.js";
class Concrete extends PageObject {
  value = 42;
}
export function compilerContract(page: Page) {
  const exact: Concrete = Concrete.create(page);
  return exact.value;
}
