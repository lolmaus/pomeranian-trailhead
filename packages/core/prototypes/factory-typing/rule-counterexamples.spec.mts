// Passing checks here reproduce the TypeScript-only gaps that the source rule rejects.
import { test, expect } from "@playwright/test";
import { falselyNumeric, invalidFixture } from "./rule-counterexamples.mts";

test("source-rejected widening and parameter-map erasure are real runtime hazards", async ({
  page,
}) => {
  await expect(invalidFixture({ page }, async () => {})).rejects.toThrow(TypeError);
  expect(falselyNumeric(page)).toBeUndefined();
});
