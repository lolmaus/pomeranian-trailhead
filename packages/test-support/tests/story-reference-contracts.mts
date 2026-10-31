import type { Page } from "@playwright/test";
import { typedStories } from "../src/stories.mts";
const options = { baseURL: "http://localhost", ready: (page: Page) => page.getByRole("button") };
// This function is compiler input only. Story code remains an erased import type.
export function checkReference(page: Page) {
  const open = typedStories<typeof import("./fixtures/counter.stories.tsx")>(
    "HTML/Counter",
    options,
  );
  void open(page, "Counting");
  // @ts-expect-error A renamed or misspelled named export must fail the package typecheck.
  void open(page, "Renamed");
  // @ts-expect-error Default metadata is not a selectable scenario.
  void open(page, "default");
  // @ts-expect-error A wrong explicit title must fail the package typecheck.
  typedStories<typeof import("./fixtures/counter.stories.tsx")>("Wrong", options);
}
