# Isolate a DOM scenario

For a small interaction, start with inline HTML in an ordinary Playwright test. A fresh browser context prevents accidental scenario state from leaking between tests. Prefer stable accessible roles and independent visible outcomes.

<!-- @example examples/inline.spec.mts#scenario -->

This example contains no application server or consumer Pomeranian package. The script belongs to the isolated test page. Larger or shared HTML-as-TSX scenarios will use the separately maintained React Storybook when that integration lands.

Keep the assertion about user-visible behavior. When replacing a direct Playwright interaction with a page object later, keep an ordinary Playwright check of the resulting UI where useful. Use [the testing guide](../guides/testing.md) for package configuration and focused commands.
