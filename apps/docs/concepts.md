# Concepts and implementation boundaries

The following vocabulary was confirmed in [the foundation decision](https://github.com/lolmaus/pomeranian-trailhead/issues/4#issuecomment-6513794545). Core construction and DOM targeting are implemented. Actions/assertions, public narrowing, selector setup and reporting remain separate work.

| Term                       | Meaning                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Page object                | An object modeling part of an application. It can represent a DOM-associated subject or organize children.                            |
| DOM-associated page object | An object whose target resolves to a Playwright locator matching zero or more elements.                                               |
| Grouping page object       | An object that coordinates children without requiring its own DOM node, forwarding effective scope.                                   |
| Application root           | An explicitly fixture-designated application anchor. Its root reference and its descendants' references identify that instance.       |
| Ad-hoc tree entry          | A parentless object initialized from a Playwright Page. Parentlessness alone does not designate an application root.                  |
| Context                    | The Playwright Page or parent object supplied during initialization.                                                                  |
| Target                     | A specification identifying an object's subject. A target family is broader than a particular input form such as a string or Locator. |

## Product contract: complete actions and assertions

Pomeranian provides a high-level API for writing routine tests using only Pomeranian page objects. Tests should read as a straightforward sequence of application behavior, in the spirit of Cucumber/Gherkin, expressed in ordinary TypeScript. Readability is the goal; mirroring the entire Playwright Locator API is not.

Page object methods expose complete operations: actions such as clicking, filling, checking, unchecking or toggling a control, and assertions that express the expected outcome. For example, the intended style is:

```ts
await root.SupportPage.FeedbackForm.Title.shouldHaveInnerText("foo");
```

This illustrates the product contract, not an implemented assertion method or a finalized naming convention. Essential actions/assertions remain planned. Their exact assertion organization and naming are decided separately.

Tests should not need to extract a Locator, import an assertion function and assemble an assertion themselves for ordinary expectations. Standard assertions retain Playwright's retry and timeout behavior. Custom page object assertions extend the application vocabulary without requiring test authors to import custom matchers or extend Playwright's `expect` API.

Raw observations such as `innerText`, `getAttribute`, `inputValue`, `count` or immediate state checks do not become page object methods merely because Locator exposes them. Returning a raw value leaves the test author to interpret it, compare it or pass it into another function. When the purpose is to assert an outcome, provide a complete assertion instead of encouraging read-then-assert code.

### Deliberate low-level escape hatch

Pomeranian permits arbitrary TypeScript test logic and direct Playwright access. When a test author deliberately needs a raw observation, use the existing `.locator` escape hatch:

```ts
const title = await root.SupportPage.FeedbackForm.Title.locator.innerText();
```

The read is legitimate when needed for further logic, but it is not the preferred style for routine assertions. In particular, reading a value first does not give a later comparison Playwright's retrying assertion semantics. [Playwright's innerText documentation](https://playwright.dev/docs/api/class-locator#locator-inner-text) recommends `toHaveText` with `useInnerText` when asserting inner text to avoid flakiness.

API additions must be justified by a complete, readable operation the test author wants to perform. High-level custom actions and assertions can use native reads internally; this contract does not restrict their implementation or prohibit advanced test logic. Full action coverage does not imply full Locator API parity or authorize raw-read wrappers.

## Production construction and historical evidence

The [throwaway proof](guides/factory-proof.md) demonstrates nullable versus application-bound roots, inherited factories, ordinary child fields, instance defaults, and field-based state. It uses string targets only. The production core now implements CSS/Locator/factory targets and internal reconstruction seams, documented in [construction](guides/construction.md). Public narrowing, naming, and production actions/assertions remain separate work.

Prototype classes called `PageObject`, `DomPageObject`, and `Element` are useful evidence for that bounded contract. They are not exported production package APIs. [Package reference pages](api/index.md) link the implemented core signatures separately from those proofs.
