[Pomeranian development reference](../../index.md) / [stories](../index.md) / StoryTitle

# Type Alias: StoryTitle\<M\>

> **StoryTitle**\<`M`\> = `M` *extends* `object` ? `Record`\<`never`, `never`\> *extends* `Record`\<`T`, `unknown`\> ? `never` : `T` *extends* `unknown` ? (`value`) => `void` : `never` *extends* (`value`) => `void` ? \[`T`\] *extends* \[`I`\] ? `T` : `never` : `never` : `never`

Defined in: [packages/test-support/src/stories.mts:7](https://github.com/lolmaus/pomeranian-trailhead/blob/main/packages/test-support/src/stories.mts#L7)

A required literal default-metadata title; widened or missing titles cannot bind.
Rejects unions and open-ended template or transformed string types as well.

## Type Parameters

### M

`M`

## Since

Available since @repo/test-support@Unreleased


> **Development infrastructure:** private workspace API, not a published Pomeranian consumer package.
