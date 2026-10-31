import type { Locator, Page } from "@playwright/test";

/** A required literal default-metadata title; widened or missing titles cannot bind.
 * @since @repo/test-support@Unreleased
 */
export type StoryTitle<M> = M extends {
  /** CSF metadata export. @since @repo/test-support@Unreleased */ default: {
    /** Explicit literal catalog title. @since @repo/test-support@Unreleased */ title: infer T extends
      string;
  };
}
  ? string extends T
    ? never
    : (T extends unknown ? (value: T) => void : never) extends (value: infer I) => void
      ? [T] extends [I]
        ? T
        : never
      : never
  : never;

/** Host and meaningful readiness observation, shared by a module's scenarios.
 * The callback stays in Node and returns an ordinary Playwright locator.
 * @since @repo/test-support@Unreleased
 */
export interface StoryOptions {
  /** Explicit URL of the framework host. @since @repo/test-support@Unreleased */
  baseURL: string;
  /** A visible control or other meaningful ready state for this module. @since @repo/test-support@Unreleased */
  ready: (page: Page) => Locator;
  /** Readiness bound in milliseconds; defaults to 15000. Index requests default to 10000.
   * @since @repo/test-support@Unreleased
   */
  timeout?: number;
}

/** Bind an erased `typeof import("./scenario.stories.tsx")` reference.
 * Literal metadata checks identity at compile time; the fresh index checks discovery.
 * Navigation preserves the Page and its portaled DOM.
 * @since @repo/test-support@Unreleased
 */
export function typedStories<M>(title: StoryTitle<M>, options: StoryOptions) {
  return async (page: Page, name: Exclude<keyof M, "default"> & string): Promise<void> => {
    const indexURL = new URL("/index.json", options.baseURL).href;
    const context = `${title}/${name} (${indexURL})`;
    let previewURL: string | undefined;
    let browserError: Error | undefined;
    const onError = (error: Error) => {
      browserError = error;
    };
    page.on("pageerror", onError);
    try {
      const response = await page.request.get(indexURL, {
        headers: { "Cache-Control": "no-cache" },
        timeout: options.timeout ?? 10000,
      });
      if (!response.ok()) throw new Error(`index unavailable: HTTP ${response.status()}`);
      const index: unknown = await response.json();
      if (
        !index ||
        typeof index !== "object" ||
        !("v" in index) ||
        index.v !== 5 ||
        !("entries" in index) ||
        !index.entries ||
        typeof index.entries !== "object" ||
        Array.isArray(index.entries)
      )
        throw new Error("unsupported or malformed Storybook index (expected v5 entries)");
      const matches = Object.values(index.entries).filter(
        (entry: unknown): entry is Record<string, unknown> =>
          Boolean(
            entry &&
            typeof entry === "object" &&
            "title" in entry &&
            entry.title === title &&
            "exportName" in entry &&
            entry.exportName === name,
          ),
      );
      if (matches.length !== 1)
        throw new Error(
          `expected one discovered story, found ${matches.length}; check title prefixes, story globs, named exports and excludeStories`,
        );
      const entry = matches[0]!;
      if (entry["type"] !== "story" || typeof entry["id"] !== "string")
        throw new Error("matching entry is not a navigable story with an ID");
      const preview = new URL("/iframe.html", options.baseURL);
      preview.searchParams.set("id", entry["id"]);
      preview.searchParams.set("viewMode", "story");
      previewURL = preview.href;
      await page.goto(preview.href);
      try {
        await options.ready(page).waitFor({ state: "visible", timeout: options.timeout ?? 15000 });
      } catch (error) {
        const visibleError = page.locator(".sb-errordisplay");
        const detail = (await visibleError.isVisible())
          ? await visibleError.innerText()
          : undefined;
        throw browserError ?? (detail ? new Error(detail) : error);
      }
      if (browserError) throw browserError;
    } catch (error) {
      throw new Error(
        `Cannot open story ${context}${previewURL ? ` preview ${previewURL}` : ""}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    } finally {
      page.off("pageerror", onError);
    }
  };
}
