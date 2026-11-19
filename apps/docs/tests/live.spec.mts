import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { checkLive } from "../lib/check-live.mts";

const resources: Record<string, string> = {
  "/": "<!doctype html><h1>Pomeranian development documentation</h1>",
  "/llms.txt":
    "# Pomeranian development documentation\n\n[Guide](/getting-started.md)\n[Types](/indexes/types.md)\n[Packages](/indexes/packages/essential.md)\n[Topics](/indexes/topics/guides.md)\n[Bundles](/indexes/bundles.md)\n[Full](/llms-full.txt)",
  "/getting-started.md":
    "# Getting started\n\nPomeranian development. [Type](/reference/TextInput.md#textinput)",
  "/indexes/types.md": "# Types\n\n[TextInput](/indexes/types/TextInput.md)",
  "/indexes/types/TextInput.md":
    "# TextInput\n\n[TextInput](/reference/TextInput.md)\n[appendText](/reference/appendText.md)",
  "/indexes/packages/essential.md": "# Essential\n\n[TextInput](/reference/TextInput.md)",
  "/indexes/topics/guides.md": "# Guides\n\n[Guide](/getting-started.md)",
  "/indexes/bundles.md":
    "# Bundles\n\n[Package](/bundles/packages/essential.md)\n[Section](/bundles/sections/guides.md)\n[Full](/llms-full.txt)",
  "/reference/TextInput.md":
    "# TextInput\n\nAvailable since @pomeranian/lib-essential@Unreleased. [appendText](/reference/appendText.md)",
  "/reference/appendText.md":
    "# appendText\n\nAvailable since @pomeranian/lib-essential@Unreleased.\n\nappendText(text: string)",
  "/bundles/packages/essential.md":
    "# Essential package\n\n<!-- BEGIN DOCUMENT: /reference/TextInput.md -->\nTextInput appendText\n<!-- END DOCUMENT: /reference/TextInput.md -->",
  "/bundles/sections/guides.md":
    "# Guides section\n\n<!-- BEGIN DOCUMENT: /getting-started.md -->\nGetting started\n<!-- END DOCUMENT: /getting-started.md -->",
  "/llms-full.txt":
    "# Complete documentation\n\n<!-- BEGIN DOCUMENT: /reference/TextInput.md -->\nTextInput appendText\n<!-- END DOCUMENT: /reference/TextInput.md -->",
};

function document(href: string) {
  return `<!-- BEGIN DOCUMENT: ${href} -->\n${resources[href]}\n<!-- END DOCUMENT: ${href} -->`;
}
resources["/bundles/packages/essential.md"] =
  document("/reference/TextInput.md") + "\n" + document("/reference/appendText.md");
resources["/bundles/sections/guides.md"] = document("/getting-started.md");
resources["/llms-full.txt"] =
  resources["/bundles/packages/essential.md"] + "\n" + resources["/bundles/sections/guides.md"];

async function serve(
  overrides: Record<string, string | number>,
  run: (origin: string) => Promise<void>,
) {
  const server = createServer((request, response) => {
    const value = { ...resources, ...overrides }[decodeURI(request.url ?? "/")];
    response.statusCode = typeof value === "number" ? value : value === undefined ? 404 : 200;
    response.end(typeof value === "string" ? value : "missing");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing fixture address");
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

test("retrieves production guide, TextInput, appendText, discovery indexes and bundles", async () => {
  await serve({}, async (origin) => {
    const checked = await checkLive(origin);
    expect(checked).toContain("/reference/appendText.md");
  });
});

test("rejects unsuccessful resource responses with the failing URL", async () => {
  await serve({ "/reference/appendText.md": 404 }, async (origin) => {
    await expect(checkLive(origin)).rejects.toThrow(/404.*appendText\.md/);
  });
});

test("rejects HTML fallback even when the expected text appears", async () => {
  await serve(
    { "/getting-started.md": "<!doctype html><h1>Getting started</h1>" },
    async (origin) => {
      await expect(checkLive(origin)).rejects.toThrow(/HTML fallback.*getting-started/);
    },
  );
});

test("rejects broken selected Markdown links and anchors", async () => {
  await serve(
    { "/getting-started.md": "# Getting started\n\n[Type](/reference/TextInput.md#missing)" },
    async (origin) => {
      await expect(checkLive(origin)).rejects.toThrow(/Broken.*anchor.*missing/);
    },
  );
});

test("rejects unexpected cross-origin redirects before fetching their target", async () => {
  const foreign = createServer((_request, response) => response.end(resources["/"]));
  await new Promise<void>((resolve) => foreign.listen(0, "127.0.0.1", resolve));
  const address = foreign.address();
  if (!address || typeof address === "string") throw new Error("Missing fixture address");
  const redirect = createServer((_request, response) => {
    response.writeHead(302, { Location: `http://127.0.0.1:${address.port}/` });
    response.end();
  });
  await new Promise<void>((resolve) => redirect.listen(0, "127.0.0.1", resolve));
  const redirectAddress = redirect.address();
  if (!redirectAddress || typeof redirectAddress === "string")
    throw new Error("Missing fixture address");
  try {
    await expect(checkLive(`http://127.0.0.1:${redirectAddress.port}`)).rejects.toThrow(
      /Cross-origin redirect/,
    );
  } finally {
    await Promise.all(
      [redirect, foreign].map(
        (server) => new Promise<void>((resolve) => server.close(() => resolve())),
      ),
    );
  }
});

test("compares downloaded resources with the checked artifact bytes", async () => {
  const { mkdtemp, mkdir, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const directory = await mkdtemp(path.join(tmpdir(), "pomeranian-live-"));
  try {
    for (const [name, value] of Object.entries(resources)) {
      const filename = path.join(directory, name === "/" ? "index.html" : name);
      await mkdir(path.dirname(filename), { recursive: true });
      await writeFile(filename, value);
    }
    await serve({}, async (origin) => {
      await checkLive(origin, directory);
    });
    await serve(
      { "/reference/appendText.md": resources["/reference/appendText.md"] + "\nStale version" },
      async (origin) => {
        await expect(checkLive(origin, directory)).rejects.toThrow(/Artifact mismatch.*appendText/);
      },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects incorrect guide content and missing discovery links", async () => {
  await serve({ "/getting-started.md": "# Unrelated page" }, async (origin) => {
    await expect(checkLive(origin)).rejects.toThrow("Wrong getting-started content");
  });
  await serve({ "/indexes/types.md": "# Types" }, async (origin) => {
    await expect(checkLive(origin)).rejects.toThrow("Missing TextInput index link");
  });
});

test("requires a visible homepage development label", async () => {
  await serve(
    { "/": '<h1>Pomeranian</h1><script>const route = "development";</script>' },
    async (origin) => {
      await expect(checkLive(origin)).rejects.toThrow("Missing homepage development labeling");
    },
  );
});

test("rejects a bundle index missing section, package or full-corpus discovery", async () => {
  await serve({ "/indexes/bundles.md": "# Empty index" }, async (origin) => {
    await expect(checkLive(origin)).rejects.toThrow(/Missing .*bundle.*link/);
  });
});

test("rejects unrelated full-corpus content even with document markers", async () => {
  await serve(
    {
      "/llms-full.txt":
        "<!-- BEGIN DOCUMENT: /unrelated.md -->\nOther content\n<!-- END DOCUMENT: /unrelated.md -->",
    },
    async (origin) => {
      await expect(checkLive(origin)).rejects.toThrow(/Incomplete full corpus/);
    },
  );
});

test("rejects bundle payloads that disagree with the full corpus", async () => {
  await serve(
    {
      "/bundles/packages/essential.md": document("/reference/TextInput.md").replace(
        "Available since",
        "Wrong availability",
      ),
    },
    async (origin) => {
      await expect(checkLive(origin)).rejects.toThrow(/Bundle differs from full corpus/);
    },
  );
});
