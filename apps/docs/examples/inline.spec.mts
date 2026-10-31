import { expect, test } from "@playwright/test";
// #region configuration
import { defineConfig } from "@playwright/test";
import { testConfig } from "@repo/test-support/config";

export const exampleConfig = defineConfig(testConfig, { testDir: "./tests" });
// #endregion configuration

// #region scenario
test("a small scenario has an independently checked visible outcome", async ({ page }) => {
  await page.setContent(`
    <button type="button">Approve</button>
    <output>Waiting</output>
    <script>
      document.querySelector('button').onclick = () => {
        document.querySelector('output').textContent = 'Approved';
      };
    </script>
  `);
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.locator("output")).toHaveText("Approved");
});
// #endregion scenario
