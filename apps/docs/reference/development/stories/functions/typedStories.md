[Pomeranian development reference](../../index.md) / [stories](../index.md) / typedStories

# Function: typedStories()

> **typedStories**\<`M`\>(`title`, `options`): (`page`, `name`) => `Promise`\<`void`\>

Defined in: [packages/test-support/src/stories.mts:43](https://github.com/lolmaus/pomeranian-trailhead/blob/main/packages/test-support/src/stories.mts#L43)

Bind an erased `typeof import("./scenario.stories.tsx")` reference.
Literal metadata checks identity at compile time; the fresh index checks discovery.
Navigation preserves the Page and its portaled DOM.

## Type Parameters

### M

`M`

## Parameters

### title

[`StoryTitle`](../type-aliases/StoryTitle.md)\<`M`\>

### options

[`StoryOptions`](../interfaces/StoryOptions.md)

## Returns

(`page`, `name`) => `Promise`\<`void`\>

## Since

Available since @repo/test-support@Unreleased


> **Development infrastructure:** private workspace API, not a published Pomeranian consumer package.
