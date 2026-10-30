// Passing assertions here CONFIRM the known unsoundness, not a sound contract.
import { test, expect } from "@playwright/test";
import { PageObject, rootFixture } from "./probe.mts";
import {
  PageOnly,
  LiteralTarget,
  NeverRoot,
  RequiredTarget,
} from "./constructor-counterexamples.mts";
class Parent extends PageObject<null> {}
test("accepted helper constructor restrictions fail at runtime", async ({ page }) => {
  const parent = Parent.create(page);
  expect(() => PageOnly.create(parent)).toThrow("Page context required");
  expect(() => LiteralTarget.create(page, "#anything")).toThrow("Specific target required");
  expect(() => RequiredTarget.create(page)).toThrow("Explicit target required");
  await expect(rootFixture(NeverRoot)({ page }, async () => {})).rejects.toThrow(
    "Root mode unsupported",
  );
});
