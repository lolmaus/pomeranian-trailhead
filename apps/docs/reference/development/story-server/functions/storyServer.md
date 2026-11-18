[Pomeranian development reference](../../index.md) / [story-server](../index.md) / storyServer

# Function: storyServer()

> **storyServer**(`port`): `NonNullable`\<`TestConfigWebServer` \| `TestConfigWebServer`[] \| `undefined`\>

Defined in: [packages/test-support/src/story-server.mts:20](https://github.com/lolmaus/pomeranian-trailhead/blob/main/packages/test-support/src/story-server.mts#L20)

Maintained Playwright lifecycle; CI/fresh runs cannot reuse a busy server.
Call assertStoryHost in globalSetup before using a reused host.

## Parameters

### port

`number`

## Returns

`NonNullable`\<`TestConfigWebServer` \| `TestConfigWebServer`[] \| `undefined`\>

## Since

Available since @repo/test-support@Unreleased


> **Development infrastructure:** private workspace API, not a published Pomeranian consumer package.
