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

## Production construction and historical evidence

The [throwaway proof](guides/factory-proof.md) demonstrates nullable versus application-bound roots, inherited factories, ordinary child fields, instance defaults, and field-based state. It uses string targets only. The production core now implements CSS/Locator/factory targets and internal reconstruction seams, documented in [construction](guides/construction.md). Public narrowing, naming, and production actions/assertions remain separate work.

Prototype classes called `PageObject`, `DomPageObject`, and `Element` are useful evidence for that bounded contract. They are not exported production package APIs. [Package reference pages](api/index.md) link the implemented core signatures separately from those proofs.
