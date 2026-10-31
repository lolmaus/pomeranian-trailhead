import { assertStoryHost, storyURL } from "@repo/test-support/story-server";
export default async function setup() {
  await assertStoryHost(storyURL(Number(process.env["STORYBOOK_SUPPORT_PORT"] ?? 6007)));
}
