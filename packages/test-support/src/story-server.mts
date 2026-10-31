import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { PlaywrightTestConfig } from "@playwright/test";

const repo = realpathSync(fileURLToPath(new URL("../../../", import.meta.url)));

/** Explicit loopback URL for an independently launched fixture suite.
 * @since @repo/test-support@Unreleased
 */
export function storyURL(port: number): string {
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error(`Invalid Storybook port: ${port}`);
  return `http://127.0.0.1:${port}`;
}

/** Maintained Playwright lifecycle; CI/fresh runs cannot reuse a busy server.
 * Call assertStoryHost in globalSetup before using a reused host.
 * @since @repo/test-support@Unreleased
 */
export function storyServer(port: number): NonNullable<PlaywrightTestConfig["webServer"]> {
  const url = storyURL(port);
  return {
    command: `pnpm exec storybook dev --host 127.0.0.1 --port ${port} --ci --no-open --exact-port`,
    cwd: fileURLToPath(new URL("../../../apps/storybook-react/", import.meta.url)),
    url: `${url}/index.json`,
    timeout: 120000,
    reuseExistingServer: !process.env["CI"] && process.env["STORYBOOK_FRESH"] !== "1",
    stdout: "pipe",
    stderr: "pipe",
  };
}

/** Reject an unrelated application or checkout and validate generated discovery.
 * This check never kills the process occupying the requested port.
 * @since @repo/test-support@Unreleased
 */
export async function assertStoryHost(baseURL: string): Promise<void> {
  try {
    const identityResponse = await fetch(new URL("/__pomeranian_host", baseURL), {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const identity: unknown = await identityResponse.json();
    if (
      !identityResponse.ok ||
      !identity ||
      typeof identity !== "object" ||
      !("host" in identity) ||
      identity.host !== "pomeranian-react-storybook" ||
      !("root" in identity) ||
      identity.root !== repo
    )
      throw new Error("incompatible application or checkout identity");
    const response = await fetch(new URL("/index.json", baseURL), {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const index: unknown = await response.json();
    if (
      !response.ok ||
      !index ||
      typeof index !== "object" ||
      !("v" in index) ||
      index.v !== 5 ||
      !("entries" in index) ||
      !index.entries ||
      typeof index.entries !== "object" ||
      !Object.values(index.entries).some(
        (entry: unknown) =>
          entry &&
          typeof entry === "object" &&
          "type" in entry &&
          entry.type === "story" &&
          "exportName" in entry,
      )
    )
      throw new Error("missing generated v5 story index with exportName");
  } catch (error) {
    throw new Error(
      `Incompatible Storybook host at ${baseURL}; use this checkout's host or a free port: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}
