import { createServer } from "node:http";
import { test, expect } from "@playwright/test";
import { typedStories } from "../src/stories.mts";

for (const [name, markup, navigates] of [
  ["meaningful readiness does not wait for a stalled image", '<img src="/stalled">', true],
  ["stalled navigation respects the configured bound", '<script src="/stalled"></script>', false],
] as const) {
  test(name, async ({ page }) => {
    page.setDefaultNavigationTimeout(1000);
    const server = createServer((req, res) => {
      if (req.url === "/stalled") {
        res.writeHead(200, { "content-type": navigates ? "image/png" : "application/javascript" });
        res.flushHeaders();
        return;
      }
      res.setHeader("content-type", req.url === "/index.json" ? "application/json" : "text/html");
      res.end(
        req.url === "/index.json"
          ? JSON.stringify({
              v: 5,
              entries: {
                one: { id: "ready", title: "Actual", exportName: "Primary", type: "story" },
              },
            })
          : `<button>Ready</button>${markup}`,
      );
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("No address");
      const open = typedStories<{ default: { title: "Actual" }; Primary: object }>("Actual", {
        baseURL: `http://127.0.0.1:${address.port}`,
        ready: (p) => p.getByRole("button", { name: "Ready" }),
        timeout: 200,
      });
      if (navigates) {
        await open(page, "Primary");
        await expect(page.getByRole("button", { name: "Ready" })).toBeVisible();
      } else {
        await expect(open(page, "Primary")).rejects.toThrow(
          /Actual\/Primary.*preview.*Timeout 200ms exceeded/s,
        );
      }
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
    }
  });
}

test("resolves actual index ID and waits for meaningful readiness", async ({ page }) => {
  const server = createServer((req, res) => {
    res.setHeader("content-type", req.url === "/index.json" ? "application/json" : "text/html");
    res.end(
      req.url === "/index.json"
        ? JSON.stringify({
            v: 5,
            entries: {
              custom: {
                id: "custom-id--actual",
                title: "Actual",
                exportName: "Primary",
                name: "Different display name",
                type: "story",
              },
            },
          })
        : "<button>Ready</button>",
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No address");
    const open = typedStories<{ default: { title: "Actual" }; Primary: object }>("Actual", {
      baseURL: `http://127.0.0.1:${address.port}`,
      ready: (p) => p.getByRole("button", { name: "Ready" }),
    });
    await open(page, "Primary");
    expect(page.url()).toContain("id=custom-id--actual");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  }
});

test("browser exception reports story context and rendering failure", async ({ page }) => {
  const server = createServer((req, res) => {
    res.setHeader("content-type", req.url === "/index.json" ? "application/json" : "text/html");
    res.end(
      req.url === "/index.json"
        ? JSON.stringify({
            v: 5,
            entries: {
              one: { id: "broken", title: "Actual", exportName: "Primary", type: "story" },
            },
          })
        : '<script>throw new Error("fixture render exploded")</script>',
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No address");
    const open = typedStories<{ default: { title: "Actual" }; Primary: object }>("Actual", {
      baseURL: `http://127.0.0.1:${address.port}`,
      ready: (p) => p.getByRole("button"),
      timeout: 300,
    });
    await expect(open(page, "Primary")).rejects.toThrow(
      /Actual\/Primary.*fixture render exploded/s,
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

for (const [name, index, message] of [
  ["malformed", {}, "malformed"],
  ["unknown title", { v: 5, entries: {} }, "found 0"],
  [
    "excluded helper",
    { v: 5, entries: { a: { id: "a", type: "story", title: "Actual", exportName: "Other" } } },
    "excludeStories",
  ],
  [
    "docs only",
    { v: 5, entries: { a: { id: "a", type: "docs", title: "Actual", exportName: "Primary" } } },
    "not a navigable story",
  ],
  [
    "ambiguous",
    {
      v: 5,
      entries: {
        a: { id: "a", type: "story", title: "Actual", exportName: "Primary" },
        b: { id: "b", type: "story", title: "Actual", exportName: "Primary" },
      },
    },
    "found 2",
  ],
  [
    "display name cannot replace exportName",
    { v: 5, entries: { a: { id: "a", type: "story", title: "Actual", name: "Primary" } } },
    "found 0",
  ],
] as const) {
  test(`index diagnostics: ${name}`, async ({ page }) => {
    const server = createServer((_req, res) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(index));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("No address");
      const url = `http://127.0.0.1:${address.port}`;
      const open = typedStories<{ default: { title: "Actual" }; Primary: object }>("Actual", {
        baseURL: url,
        ready: (p) => p.locator("button"),
      });
      await expect(open(page, "Primary")).rejects.toThrow(message);
      await expect(open(page, "Primary")).rejects.toThrow(`Actual/Primary (${url}/index.json)`);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
}
