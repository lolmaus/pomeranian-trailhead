# Package API reference

There are no production Pomeranian exports in this repository yet. These pages track intended ownership and explicitly avoid inventing signatures.

| Package                                         | Current status                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [@pomeranian/core](core.md)                     | Planned foundational framework package; only a separate throwaway proof exists.                  |
| [@pomeranian/lib-essential](lib-essential.md)   | Planned essential page objects; no implementation or installable release.                        |
| [@pomeranian/lib-ant-design](lib-ant-design.md) | Candidate first component-library integration; coverage and supported versions remain undecided. |

The [development-infrastructure reference](../reference/development/index.md) documents the existing private test-support export. The [prototype helper context](../reference/prototype-helpers.md) is clearly labelled experimental evidence.

When a production package arrives, its exported API and intended protected subclass hooks must be registered in the shared generator, documented in owning source comments, and linked from this navigation. Missing documentation must fail checks rather than making a symbol disappear.
