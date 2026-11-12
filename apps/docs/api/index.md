# Package API reference

Production core construction and targets are implemented and documented from source. No package has been published yet. Other package pages distinguish planned ownership.

| Package                                         | Current status                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [@pomeranian/core](core.md)                     | Implemented Unreleased construction/targets, locally buildable and packable.                     |
| [@pomeranian/lib-essential](lib-essential.md)   | Implemented Unreleased Element basic interactions; no installable release.                       |
| [@pomeranian/lib-ant-design](lib-ant-design.md) | Candidate first component-library integration; coverage and supported versions remain undecided. |

The [development-infrastructure reference](../reference/development/index.md) documents private test-support configuration, typed story navigation, and host lifecycle exports. The [prototype helper context](../reference/prototype-helpers.md) is clearly labelled experimental evidence.

Every production package's exported API and intended protected subclass hooks must be registered in the shared generator, documented in owning source comments, and linked from this navigation. Missing documentation must fail checks rather than making a symbol disappear.
