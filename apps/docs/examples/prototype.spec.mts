import { expect, test } from "@playwright/test";
// #region prototype
import { LibraryButton } from "../../../packages/core/prototypes/factory-typing/probe.mts";

test("the actual prototype library factory supports a neutral root", async ({ page }) => {
  await page.setContent('<button class="library">Approve</button><output>Waiting</output>');
  await page.getByRole("button").evaluate((button) => {
    button.addEventListener("click", () => {
      const output = document.querySelector("output");
      if (output) output.textContent = "Approved";
    });
  });
  const button = LibraryButton.create(page);
  expect(button.root).toBeNull();
  await button.click();
  await expect(page.locator("output")).toHaveText("Approved");
});
// #endregion prototype

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type App = import("../../../packages/core/prototypes/factory-typing/probe.mts").App;
type AppButton = import("../../../packages/core/prototypes/factory-typing/probe.mts").AppButton;
type StandaloneButton =
  import("../../../packages/core/prototypes/factory-typing/probe.mts").StandaloneButton;
type FlexibleButton =
  import("../../../packages/core/prototypes/factory-typing/probe.mts").FlexibleButton;
const exactRoots: [
  Equal<AppButton["root"], App>,
  Equal<StandaloneButton["root"], null>,
  Equal<FlexibleButton["root"], App | null>,
] = [true, true, true];
void exactRoots;
