import { createServer } from "node:http";
import { test, expect } from "@playwright/test";
import { assertStoryHost } from "../src/story-server.mts";
test("an incompatible server fails with actionable identity diagnostics", async () => {
  const server = createServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end("{}");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No address");
    await expect(assertStoryHost(`http://127.0.0.1:${address.port}`)).rejects.toThrow(
      /incompatible.*checkout/i,
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
