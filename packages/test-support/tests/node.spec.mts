import { expect, test as base } from "@playwright/test";

const test = base.extend({
  browser: async () => {
    throw new Error("Node-only checks must not acquire a browser");
  },
});

test("Node-only checks leave browser fixtures lazy", () => {
  expect(process.release.name).toBe("node");
});
