import { typedStories } from "../src/stories.mts";
// @ts-expect-error Wrong literal title must fail.
typedStories<{ default: { title: "Actual" }; Primary: object }>("Wrong", {
  baseURL: "http://localhost",
  ready: (p) => p.locator("button"),
});
const options = {
  baseURL: "http://localhost",
  ready: (p: import("@playwright/test").Page) => p.locator("button"),
};
const open = typedStories<{ default: { title: "Actual" }; Primary: object }>("Actual", options);
void open;
// @ts-expect-error Widened metadata must not accept any title.
typedStories<{ default: { title: string }; Primary: object }>("Actual", options);
// @ts-expect-error Optional titles are unchecked.
typedStories<{ default: { title?: "Actual" }; Primary: object }>("Actual", options);
// @ts-expect-error Missing titles are unchecked.
typedStories<{ default: object; Primary: object }>("Actual", options);
// @ts-expect-error Missing modules must be resolved by the real compiler.
type MissingModule = typeof import("./no-such-story.tsx");
