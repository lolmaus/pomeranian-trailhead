import { test, expect } from "@playwright/test";
import * as essential from "../src/index.js";

test("append preserves the existing value", async ({ page }) => {
  await page.setContent('<input value="Hello">');
  const text = essential.TextInput.create(page, "input");
  expect("appendText" in text).toBe(true);
  await (text as typeof text & { appendText(text: string): Promise<void> }).appendText(" world");
  await expect(text.locator).toHaveValue("Hello world");
});
