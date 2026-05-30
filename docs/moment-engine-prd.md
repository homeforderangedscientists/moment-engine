# moment-engine — Product Requirements Document

**Version:** 0.1 (initial release)
**Date:** April 2026
**Repository:** `homeforderangedscientists/moment-engine` (TBD)
**Package:** `moment-engine` on public npm (if available; else `@hfds/moment-engine` scoped)
**API sketch:** `moment-engine-api.ts` (separate document)

---

## Summary

`moment-engine` is a small TypeScript library for computing the current moment as a ratio of various time containers — hours, days, decades, the age of the universe. Given a set of container definitions and a current instant, the library produces a list of computed "moments" where each moment expresses the present as a fraction of its container, along with metadata that tells consumers how to render it.

The library is the shared foundation for two Home For Deranged Scientists apps — `approximately` (a single-tile slideshow) and `fractional-clock` (a full ladder-and-zoom contemplative tool) — and is designed to be reusable in other applications that want to reason about time as nested fractions.

---

## Goals

- **One library, two consumers, many possibilities.** The API should serve `approximately` and `fractional-clock` equally well, and should be designed so that hypothetical third or fourth consumers can build on it without changes to the engine itself.

- **Pure functions over data.** The engine performs computation; it does not manage rendering, DOM, network, or side effects. Given the same inputs, it always returns the same outputs.

- **Framework-agnostic.** Zero dependencies on React, Vue, or any other UI framework. Plain TypeScript, usable from any JavaScript environment including Node, Deno, browsers, and web workers.

- **Extensibility through data, not code.** New scales are added by defining new containers, not by modifying the engine. The engine's five rule types are intended to be sufficient for every container the consuming apps want to express.

- **Testability as a first-class concern.** Every function is pure, and time is always injected as an argument. This makes unit testing trivial and gives consumers fine-grained control over virtual time for animations and tests.

---

## Non-goals

- **Not a general time library.** `moment-engine` is not a replacement for `date-fns`, `luxon`, or `dayjs`. It does not parse strings, format dates, handle locale-specific calendar rules, or manipulate timezones beyond what's needed for calendar-period boundary calculation. Consumers should bring their own date formatting.

- **Not a rendering library.** The engine computes state and classifies how tiles should be rendered (by returning a `rendering_mode`), but the actual pixel-level rendering is entirely the consumer's concern.

- **Not a UI component library.** There are no React hooks, Vue composables, or web components exported from this package. Consumers build their own integrations on top of the pure functional API.

- **Not a persistence layer.** The engine does not know how to save or load containers or milestones. Consumers are responsible for persistence.

- **No runtime configuration magic.** No global state, no singletons, no configuration loaded from environment variables. Every function takes the configuration it needs as an argument.

---

## Scope for 0.1 (initial release)

### Included

- The full type system defined in `moment-engine-api.ts`:
  - `Instant`, `Duration`, `CalendarPeriod`, `TickRate`, `RenderingMode`
  - `Milestone`, `Container`, `Moment`, `Rule`, `EngineConfig`

- The full function set defined in the API sketch:
  - `evaluateRule`
  - `computeMoment`, `computeMoments`
  - `selectRenderingMode`
  - `computeTickRate`, `tickRateToInterval`
  - `findReferenceMilestone`, `computeReferenceSpan`

- Five rule types covering all envisioned containers:
  - `absolute` (fixed calendar date)
  - `years_before_present` (N years before evaluation instant)
  - `calendar_start` and `calendar_end` (current calendar period boundaries)
  - `milestone` (named user milestone)
  - `milestone_offset` (milestone plus or minus a duration in years)
  - `now` (the evaluation instant itself, for duration-mode end rules)

- Calendar period support for hour, day, week, month, year, decade, century, millennium.

- Timezone-aware calendar period boundary calculation, defaulting to the environment's local timezone but accepting an IANA timezone string via config.

- ISO 8601 (Monday) week start as default, with Sunday as an option.

- Comprehensive test suite: every rule type tested, every rendering mode tested, edge cases around timezone boundaries and milestone resolution failures.

- Public npm release.

- README with a short worked example showing a consumer computing moments for a small container set.

- Changelog following Keep-a-Changelog format.

### Excluded from 0.1

- **Sub-year duration offsets on `milestone_offset` rules.** Current rule type assumes year-granularity offsets. If sub-year offsets become needed, the rule can be extended without a breaking change.

- **Rolling-window calendar periods** (e.g., "the last 7 days," "the last year"). Calendar periods are current-period only. Rolling windows can be expressed via `absolute` or `years_before_present` rules.

- **Leap second handling.** The engine treats a year as 365.25 days and does not consult leap-second tables. This is acceptable imprecision at the scales the engine targets.

- **Lunar, Hijri, Hebrew, or other non-Gregorian calendar systems.** The engine assumes Gregorian throughout. Support for other systems would require a significant redesign and is not on any roadmap.

- **Streaming or observable APIs.** The engine exposes only pure functions. Consumers who want reactive updates build that on top (e.g., via a React hook that calls `computeMoments` on a tick interval).

- **Bundled container libraries.** The engine does not ship a default set of containers. Each consuming app defines its own. This is intentional — the content (what scales are interesting) is app-specific even though the math is shared.

---

## Architecture

### Module layout

A small library with a single flat entry point. No submodules, no deep imports. All exports available from `moment-engine`:

```ts
import {
  computeMoments,
  computeMoment,
  evaluateRule,
  selectRenderingMode,
  computeTickRate,
  tickRateToInterval,
  findReferenceMilestone,
  computeReferenceSpan,
  type Container,
  type Milestone,
  type Moment,
  type Rule,
  type EngineConfig,
  type CalendarPeriod,
  type RenderingMode,
  type TickRate,
  type Instant,
  type Duration,
} from 'moment-engine';
```

Internally, the implementation may be split across multiple files for organization (rule evaluation, calendar math, mode selection, etc.), but the public API is flat.

### Dependencies

The engine has **zero runtime dependencies**. Calendar period calculation is implemented using the platform's `Intl.DateTimeFormat` and standard `Date` APIs, both of which handle timezones correctly in modern JS environments.

Development dependencies are minimal: TypeScript, a test runner (Vitest or similar), and standard linting/formatting tools.

### Build output

The package ships with:

- ESM build (`dist/index.mjs`)
- CommonJS build (`dist/index.cjs`)
- TypeScript declarations (`dist/index.d.ts`)
- Source maps for both builds

No bundled build (consumers bundle with their own tooling). Target is modern JS (ES2022 or similar — the library uses no unusually cutting-edge features). Minimum supported Node version is whatever's LTS at release time.

### Error handling

The engine distinguishes between _invalid input_ (a bug in the consumer) and _unresolvable input_ (a valid situation the engine can't produce an answer for):

- **Invalid input** — malformed containers, impossible rules, nonsensical configurations — throws. Consumers should catch these during development and fix them.

- **Unresolvable input** — a rule references a milestone that doesn't exist, for example — returns null from the affected function. Consumers should check for nulls and skip the affected container rather than crash.

The distinction matters because unresolvable input is a normal runtime condition for apps that support user-added milestones (a container referencing a milestone the user hasn't added yet is common). Throwing in that case would force every consumer to wrap calls in try/catch.

---

## Testing strategy

Testing is load-bearing for this library. Bugs in the engine propagate to both consuming apps and any future consumers, and the engine ships as a versioned package where bugs cost a release cycle to fix.

### Test categories

1. **Rule evaluation** — every rule type tested with representative inputs. Calendar rules tested across timezone boundaries (DST transitions, year boundaries, leap days). Milestone rules tested with present and missing milestones. Years-before-present tested at both shallow (1 year) and deep (10 billion years) scales.

2. **Moment computation** — end-to-end tests that fix a current instant and a container set, compute the full `Moment` output, and compare against hand-computed expected values. A handful of these per rendering mode covers the integration surface.

3. **Rendering mode selection** — explicit tests for each mode and for the boundaries between modes. Verify that a container exactly at `scale_mode_threshold` goes one way and a container one millisecond different goes the other way.

4. **Tick rate derivation** — explicit tests for each rate and the boundaries between them.

5. **Edge cases** — zero-duration containers, containers with end before start, milestones at the exact evaluation instant, containers that would have negative position, etc. These should either produce sensible values or fail cleanly with clear errors.

6. **Timezone handling** — a dedicated suite that verifies calendar period boundaries are correct across multiple timezones, especially around DST transitions where local midnight may not correspond to UTC midnight.

### Coverage target

Not a strict percentage, but every exported function must have at least one dedicated test, and every rule type must have at least one test where it's the rule being exercised. Internal functions don't need individual tests if they're fully exercised by public-function tests.

### Property-based testing (optional)

For rule evaluation and moment computation, property-based tests (via fast-check or similar) are a good fit:

- For any container and instant, the computed position should fall in [0, 1] for position-mode tiles.
- For any container ending at now, the computed position should equal 1.0.
- For any reference span and container duration, the fraction in scale or duration mode should equal the expected ratio within floating-point tolerance.

Property tests are nice-to-have for 0.1. Can be added in 0.2.

---

## Release and versioning

### Semantic versioning

The engine follows strict semver from 1.0 onward. Pre-1.0 releases (0.x) may introduce breaking changes in minor version bumps, which is conventional but worth stating. Consumers pinning to 0.x versions should expect to review changelogs on each minor update.

The engine targets 1.0 once the API has proven itself through at least one full build cycle of `approximately` and ideally also `fractional-clock`. Until then, breaking changes are allowed.

### Publishing

- Published to public npm as `moment-engine` (if available at publish time) or `@hfds/moment-engine` scoped to the HFDS org.
- Tagged releases in git corresponding to published versions.
- CHANGELOG.md maintained for every release.

### Development workflow for consumers

During active development across engine and consuming apps, consumers use pnpm's `file:` protocol to depend on a local checkout of the engine:

```json
{
  "dependencies": {
    "moment-engine": "file:../moment-engine"
  }
}
```

This gives instant feedback: changes in the engine are picked up on the next build of the consumer. When a meaningful release boundary is reached, the engine publishes a new version and consumers switch to a registry dependency.

---

## Documentation

### In-repo

- **README.md** — what the library is, why it exists, a worked example, install and usage basics, link to full API docs.
- **API reference** — generated from TSDoc comments in the source (the API sketch is already heavily annotated; that documentation carries into the implementation).
- **CHANGELOG.md** — per-release changes following Keep-a-Changelog conventions.
- **CONTRIBUTING.md** — for future contributors, once the project stabilizes.

### External

- No dedicated documentation site at 0.1. The README and TSDoc-generated reference are sufficient.
- Example usage from `approximately` and `fractional-clock` serves as the best extended documentation.

---

## Build sequence

The engine's build is small enough to fit in a single focused session, probably one or two days of solo work. A reasonable order:

1. **Project skeleton.** Repo, TypeScript config, test runner, lint, CI scaffolding (GitHub Actions or similar). No logic yet.

2. **Types and stubs.** All types from the API sketch defined in a single `types.ts`. All functions stubbed with the correct signatures, returning null or throwing "not implemented." This gives something that typechecks and makes dependency ordering explicit.

3. **Rule evaluation.** Implement `evaluateRule` with tests for every rule type. This is the most foundational piece — nothing else works without it. Timezone handling lands here.

4. **Mode selection and tick rates.** Implement `selectRenderingMode`, `computeTickRate`, `tickRateToInterval`. Simple functions, quick to implement and test.

5. **Reference span and milestone helpers.** Implement `findReferenceMilestone`, `computeReferenceSpan`. Small.

6. **Moment computation.** Implement `computeMoment` and `computeMoments` on top of everything above. Integration-level tests here.

7. **Polish.** README, examples, changelog seed entry, npm publish dry-run.

8. **First release.** Publish 0.1.0 to npm. Done.

---

## Open questions (to be resolved during implementation)

1. **Package name availability.** `moment-engine` may be taken on npm. If so, scoped name `@hfds/moment-engine` or a rename. To be checked before first commit.

2. **Timezone handling details.** Whether to rely entirely on `Intl.DateTimeFormat` for calendar boundaries or to pull in a small internal helper. Leaning on `Intl` unless tests reveal gaps.

3. **Whether to expose `evaluateContainer`** as a separate function returning just `{start, end}` without the full moment computation. Minor ergonomic addition; decide during implementation when the actual code calls become visible.

4. **The `fallback_reference_span` default.** Currently 30 years in the sketch. Possibly should be longer (50? 40?) or possibly null is the right default and consumers should opt into a fallback explicitly. Decide before 0.1 stabilizes.

5. **Deep-time floating-point precision.** JS numbers handle 13.8 billion years as milliseconds fine (well within safe float range). But fractions as small as 3×10⁻¹⁰ have their own formatting concerns. The engine returns the raw fraction and leaves formatting to consumers; worth documenting as a gotcha.

6. **The `metadata` generic parameter** — keep or drop? Keep probably; costs nothing at runtime and helps consumers with TypeScript type safety.

---

## Appendix — Relationship to consuming apps

The engine's design reflects what the two initial consuming apps need:

**`approximately`** uses the engine as follows:

- Defines a curated container set in its own code.
- Calls `computeMoments` on a ticker to update the currently-displayed tile.
- Reads `rendering_mode` to pick the right single-tile composition.
- Uses `tick_rate` to decide when to recompute (though for a slideshow, tile advances happen on a slideshow timer, not the engine's tick rate).
- Ignores milestones entirely in v1 (no user personalization), so `computeReferenceSpan` returns null and the engine falls back to its default reference span.

**`fractional-clock`** uses the engine as follows:

- Defines a richer container set including user-milestone-based containers.
- Calls `computeMoments` continuously as the user interacts.
- Sorts resulting moments by `container_duration` for ladder ordering.
- Uses `rendering_mode` to pick ladder tile and zoom view compositions.
- Uses `tick_rate` to throttle per-tile updates.
- Passes user milestones from local storage into every call.

Both apps treat the engine identically at the API level. The difference is in what containers they define and how they compose the results. This is exactly the separation the engine is designed for.
