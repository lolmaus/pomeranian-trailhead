import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { stripVTControlCharacters } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { test, expect } from "@playwright/test";

const owner = fileURLToPath(new URL("../", import.meta.url));
const host = fileURLToPath(new URL("../../../apps/storybook-react/", import.meta.url));
async function freePort() {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No port");
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return address.port;
}
async function reachable(port: number) {
  try {
    return (
      await fetch(`http://127.0.0.1:${port}/index.json`, { signal: AbortSignal.timeout(500) })
    ).ok;
  } catch {
    return false;
  }
}
function run(
  port: number,
  extra: Record<string, string> = {},
  selection = ["-g", "extracted HTML"],
) {
  return new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "pomeranian-lifecycle-"));
    const child = spawn(
      "pnpm",
      ["run", "test:stories", ...selection, "--reporter=line", "--output", outputDirectory],
      {
        cwd: owner,
        env: {
          ...process.env,
          CI: "",
          STORYBOOK_FRESH: "",
          STORYBOOK_SUPPORT_PORT: String(port),
          ...extra,
        },
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    const timer = setTimeout(() => {
      if (child.pid) process.kill(-child.pid, "SIGTERM");
      reject(new Error(`Lifecycle command timed out: ${output}`));
    }, 90000);
    child.stdout.on("data", (chunk) => {
      output += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += String(chunk);
    });
    child.once("error", reject);
    child.once("close", (code) => {
      clearTimeout(timer);
      rmSync(outputDirectory, { recursive: true, force: true });
      resolve({ code, output: stripVTControlCharacters(output) });
    });
  });
}

test("process lifecycle: reuse validates identity; fresh and CI reject occupied port", async () => {
  test.setTimeout(120000);
  const port = await freePort();
  const child = spawn(
    "pnpm",
    [
      "exec",
      "storybook",
      "dev",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--ci",
      "--no-open",
      "--exact-port",
    ],
    { cwd: host, env: process.env, detached: true, stdio: "ignore" },
  );
  try {
    await expect.poll(() => reachable(port), { timeout: 30000 }).toBe(true);
    const reused = await run(port);
    expect(reused.code, reused.output).toBe(0);
    expect(reused.output).not.toContain("[WebServer]");
    expect(await reachable(port)).toBe(true);
    for (const env of [{ STORYBOOK_FRESH: "1" }, { CI: "true" }]) {
      const busy = await run(port, env);
      expect(busy.code, busy.output).not.toBe(0);
      expect(busy.output).toContain("already used");
      expect(await reachable(port)).toBe(true);
    }
  } finally {
    if (child.pid) process.kill(-child.pid, "SIGTERM");
    await new Promise<void>((resolve) => child.once("close", () => resolve()));
  }
  await expect.poll(() => reachable(port)).toBe(false);
  for (const env of [{ STORYBOOK_FRESH: "1" }, { CI: "true" }]) {
    const clean = await run(port, env);
    expect(clean.code, clean.output).toBe(0);
    await expect.poll(() => reachable(port)).toBe(false);
  }
});

test("process lifecycle: incompatible occupied server and failing test clean up", async () => {
  test.setTimeout(120000);
  const port = await freePort();
  const server = createServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end("{}");
  });
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  try {
    const result = await run(port);
    expect(result.code, result.output).not.toBe(0);
    expect(result.output).toContain("Incompatible Storybook host");
    expect(await reachable(port)).toBe(true);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  const directory = await mkdtemp(`${owner}tests/lifecycle-`);
  try {
    const file = `${directory}/failure.story.spec.mts`;
    await writeFile(
      file,
      'import {test,expect} from "@playwright/test";test("lifecycle intentional failure",()=>{expect(1).toBe(2);});',
    );
    const failed = await run(port, { FORCE_COLOR: "1", NO_COLOR: "" }, [
      file,
      "-g",
      "lifecycle intentional failure",
    ]);
    expect(failed.code, failed.output).not.toBe(0);
    expect(failed.output).toContain("Expected: 2");
    await expect.poll(() => reachable(port)).toBe(false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
