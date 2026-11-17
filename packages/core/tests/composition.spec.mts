import { test, expect } from "@playwright/test";
import { PageObject } from "../src/page-object.ts";

test("page objects expose inherited capability composition", () => {
  expect("with" in PageObject && typeof PageObject.with).toBe("function");
});
