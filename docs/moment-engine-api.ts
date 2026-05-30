/**
 * moment-engine
 *
 * A library for computing the current moment as a ratio of various time
 * containers — hours, days, decades, the age of the universe. Given a set of
 * containers and a current instant, the engine produces a list of "moments"
 * where each moment expresses the present as a fraction of its container.
 *
 * This file is an API sketch. The types and function signatures here are the
 * contract; the implementation is separate. Expect to iterate on this sketch
 * before any implementation is written.
 *
 * Design principles:
 *
 * 1. Pure functions over data. The engine does not touch the DOM, the network,
 *    or any side-effectful API. Given the same inputs, the same outputs.
 *
 * 2. Time is injected. The current instant is always passed as an argument,
 *    never read from `Date.now()` inside the engine. This makes every function
 *    trivially testable and lets callers control virtual time for animations
 *    or testing.
 *
 * 3. The engine knows nothing about rendering. It does not care about pixels,
 *    colors, fonts, or layout. It computes what each container's current state
 *    is and hands that state to the caller, who decides how to display it.
 *
 * 4. Extensibility comes from adding containers, not from changing the engine.
 *    The five rule types defined below are intended to be sufficient for every
 *    kind of container the apps want to define. If a container can't be
 *    expressed in these rules, that's a signal to revisit the rule set — not
 *    to add imperative logic into container definitions.
 *
 * 5. The engine is framework-agnostic. It ships as plain TypeScript with zero
 *    framework dependencies. React, Vue, vanilla JS — all consumers are equal.
 */

// =============================================================================
// Core types
// =============================================================================

/**
 * A point in time, represented as milliseconds since the Unix epoch.
 *
 * The engine uses milliseconds consistently rather than mixing seconds and
 * milliseconds. `Date.now()` in the browser returns milliseconds, so this is
 * a zero-cost choice for JS consumers.
 *
 * Some container start dates are billions of years before the present, which
 * exceeds the 64-bit-float-safe integer range but not the float range itself.
 * The engine accepts the small precision loss on deep-time calculations
 * because the smallest unit we care about at those scales is the year, and
 * a billion years fits comfortably in a float's representable range.
 */
export type Instant = number;

/**
 * A duration in milliseconds. Always positive.
 */
export type Duration = number;

/**
 * A milestone is a named point in time authored by a user. Milestones are
 * referenced by their id from within container rules (e.g. a rule that says
 * "start at the birth milestone").
 *
 * The `is_reference` flag marks a milestone as the anchor for life-relative
 * calculations (e.g. "how long have you been alive"). At most one milestone
 * in a given set should carry this flag. The engine does not enforce
 * uniqueness — the caller is responsible for ensuring at most one reference
 * milestone exists.
 *
 * The `label` is free-text authored by the caller. The engine does not use
 * it for computation; it's passed through for the caller's convenience.
 */
export interface Milestone {
  id: string;
  label: string;
  date: Instant;
  is_reference?: boolean;
}

/**
 * Calendar period identifiers used in calendar_start and calendar_end rules.
 *
 * "Current" is implicit — calendar_start: 'week' means "the start of the week
 * that contains the instant being evaluated."
 *
 * Week starts are ISO (Monday) by default. If a future version supports
 * locale-aware week starts, that becomes an option on the rule.
 *
 * Decade means the calendar decade (2020s, 2030s), not a rolling ten-year
 * window. Century follows the same pattern.
 */
export type CalendarPeriod =
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'year'
  | 'decade'
  | 'century'
  | 'millennium';

/**
 * A rule for computing a container's start or end. Rules are declarative —
 * they describe what to compute, not how. The engine evaluates rules against
 * a given instant and milestone set to produce concrete `Instant` values.
 *
 * Five rule types cover every container currently envisioned:
 *
 * - `absolute`: a fixed calendar date, for historical anchors with known dates
 *    (e.g. Jan 1, year 1 CE).
 *
 * - `years_before_present`: a number of years before the evaluation instant,
 *    for deep-time anchors expressed in years-ago terms (e.g. 13.8 billion).
 *    Uses 365.25 days per year as the standard conversion; this introduces
 *    small imprecision at shallow scales but is correct at the scales where
 *    years-before-present rules are used.
 *
 * - `calendar_start` / `calendar_end`: the start or end of a calendar period
 *    containing the evaluation instant. Handles timezones, leap years, and
 *    month-length variation.
 *
 * - `milestone`: the date of a named milestone. Fails gracefully if the
 *    referenced milestone doesn't exist (see "Error handling" below).
 *
 * - `milestone_offset`: a milestone's date plus or minus a duration expressed
 *    in years. Used for containers like "your 40s" (birth + 40 years to birth
 *    + 50 years). Note: offsets are in years for now; if sub-year offsets
 *    become needed, the rule type can be extended without a breaking change
 *    by making the offset a discriminated value.
 *
 * - `now`: the evaluation instant itself. Only valid as an end rule. Used for
 *    duration-mode containers (e.g. "since you got married").
 */
export type Rule =
  | { type: 'absolute'; date: Instant }
  | { type: 'years_before_present'; years: number }
  | { type: 'calendar_start'; period: CalendarPeriod }
  | { type: 'calendar_end'; period: CalendarPeriod }
  | { type: 'milestone'; milestone_id: string }
  | { type: 'milestone_offset'; milestone_id: string; offset_years: number }
  | { type: 'now' };

/**
 * Tick rate hints tell the caller how often the rendered state for a
 * container visibly changes. The engine computes a recommended update
 * interval based on container size; the caller uses this to throttle
 * re-renders.
 *
 * - `high`: sub-second to multi-second changes. Used for containers shorter
 *    than a day (e.g. this hour).
 * - `medium`: minute to hour-scale changes. Used for day-to-year containers.
 * - `low`: daily changes. Used for decade-to-century containers.
 * - `static`: effectively never changes. Used for all deep-time containers
 *    where the current percentage changes by an imperceptible amount per day.
 */
export type TickRate = 'high' | 'medium' | 'low' | 'static';

/**
 * Rendering modes describe how a tile should be visually presented. The
 * engine selects the mode for each container based on its geometry; the
 * caller interprets the mode to pick a layout, bar treatment, or annotation
 * style.
 *
 * - `position`: the container brackets the current instant. The meaningful
 *    quantity is "where is now inside this container." Example: this hour,
 *    today, this year.
 *
 * - `scale`: the container is much larger than a human life. The meaningful
 *    quantity is the ratio of a reference span (usually the user's life so
 *    far) to the container. Example: since the dinosaurs, since the universe.
 *
 * - `duration`: the container ends at now. The meaningful quantity is the
 *    container itself expressed as a fraction of a reference span (usually
 *    the user's life so far). Example: since you got married.
 *
 * Mode selection is purely a function of container geometry; see
 * `selectRenderingMode` for the algorithm.
 */
export type RenderingMode = 'position' | 'scale' | 'duration';

/**
 * A container definition. Containers are the inputs to the engine — the set
 * of scales at which the current moment is to be expressed.
 *
 * The `id` is stable across versions. If a container is renamed, relabeled,
 * or rewritten, its id does not change. Consumers can rely on ids for
 * routing, share-link stability, and user preferences.
 *
 * The `metadata` field is opaque to the engine — consumers may stash
 * app-specific data there (display labels, share-text templates, tonal
 * annotations) without the engine needing to know about it. The engine
 * passes it through unchanged to the resulting `Moment`.
 */
export interface Container<M = unknown> {
  id: string;
  start: Rule;
  end: Rule;
  metadata?: M;
}

/**
 * A computed moment — the engine's output for a single container at a single
 * instant.
 *
 * - `container_id`: the id of the container this moment belongs to.
 * - `start`, `end`: the resolved container bounds as Instants.
 * - `container_duration`: end - start, cached for consumer convenience.
 * - `position`: where the evaluated instant falls within the container, as a
 *    fraction in [0, 1]. For duration-mode containers (ending at now), this
 *    is always 1.0.
 * - `fraction`: the meaningful quantity for this tile, as a fraction in
 *    [0, 1] or a small positive number approaching zero for deep-time scale
 *    tiles. What `fraction` represents depends on the rendering mode:
 *      - position mode: same as `position` (where now is inside the container)
 *      - scale mode: reference_span / container_duration
 *      - duration mode: container_duration / reference_span
 *    Consumers typically display `fraction * 100` as a percentage.
 * - `rendering_mode`: the mode selected by the engine for this container.
 * - `tick_rate`: the recommended update frequency for this tile.
 * - `reference_span`: the duration used as the denominator for scale/duration
 *    modes. Typically the user's life-so-far. Null if no reference milestone
 *    is available, in which case scale/duration modes still compute but
 *    using a fallback span (see design notes).
 * - `metadata`: passed through from the container unchanged.
 */
export interface Moment<M = unknown> {
  container_id: string;
  start: Instant;
  end: Instant;
  container_duration: Duration;
  position: number;
  fraction: number;
  rendering_mode: RenderingMode;
  tick_rate: TickRate;
  reference_span: Duration | null;
  metadata?: M;
}

/**
 * Configuration for engine behavior. All fields are optional; sensible
 * defaults apply.
 *
 * - `scale_mode_threshold`: the ratio of container_duration to reference_span
 *    above which rendering_mode switches from position to scale. Default 100.
 *    At a threshold of 100, a container must be at least 100x the user's
 *    life-so-far to be rendered in scale mode.
 *
 * - `fallback_reference_span`: the span to use when no reference milestone
 *    exists. Default is 30 years (expressed in milliseconds). This keeps
 *    scale and duration modes rendering something sensible for anonymous
 *    users without forcing the caller to inject a user age.
 *
 * - `week_start`: the weekday that starts a week for calendar_start('week').
 *    Default is 'monday' (ISO 8601). Accepts 'sunday' or 'monday'.
 *
 * - `timezone`: IANA timezone string for calendar period calculations.
 *    Default is the environment's local timezone. Pass a specific zone for
 *    server-side rendering or test determinism.
 */
export interface EngineConfig {
  scale_mode_threshold?: number;
  fallback_reference_span?: Duration;
  week_start?: 'sunday' | 'monday';
  timezone?: string;
}

// =============================================================================
// Core functions
// =============================================================================

/**
 * Evaluate a rule against a given instant and milestone set, producing a
 * concrete instant.
 *
 * This is primarily an internal function exposed for consumers who want to
 * compute container bounds without going through the full `computeMoment`
 * pipeline. Most callers will use `computeMoment` directly.
 *
 * Error handling: if a milestone or milestone_offset rule references a
 * milestone id that doesn't exist in the provided milestones array, this
 * function returns null rather than throwing. Consumers should check for
 * null and skip the container.
 *
 * @param rule - the rule to evaluate
 * @param now - the current instant
 * @param milestones - the set of available milestones
 * @param config - engine configuration
 * @returns the resolved instant, or null if the rule can't be resolved
 */
export function evaluateRule(
  rule: Rule,
  now: Instant,
  milestones: Milestone[],
  config?: EngineConfig,
): Instant | null;

/**
 * Compute the moment for a single container.
 *
 * This is the engine's main function. Given a container, the current
 * instant, and the user's milestones, it returns the complete state needed
 * to render the tile — bounds, position, fraction, rendering mode, tick
 * rate, and reference span.
 *
 * Error handling: if either the container's start or end rule can't be
 * resolved (e.g. references a missing milestone), this function returns
 * null. Consumers should filter nulls out of their rendering pipeline.
 *
 * @param container - the container definition
 * @param now - the current instant
 * @param milestones - the user's milestones
 * @param config - engine configuration
 * @returns a computed moment, or null if the container can't be resolved
 */
export function computeMoment<M>(
  container: Container<M>,
  now: Instant,
  milestones: Milestone[],
  config?: EngineConfig,
): Moment<M> | null;

/**
 * Compute moments for a set of containers. Convenience function that maps
 * `computeMoment` over the array and filters out nulls.
 *
 * The returned array preserves the input order, minus any containers that
 * couldn't be resolved. Callers who need to know which containers were
 * filtered should use `computeMoment` directly.
 *
 * @param containers - the container definitions
 * @param now - the current instant
 * @param milestones - the user's milestones
 * @param config - engine configuration
 * @returns an array of computed moments
 */
export function computeMoments<M>(
  containers: Container<M>[],
  now: Instant,
  milestones: Milestone[],
  config?: EngineConfig,
): Moment<M>[];

/**
 * Select the rendering mode for a container given its resolved bounds and
 * the reference span.
 *
 * Algorithm:
 * 1. If end equals now (to within some small epsilon), return 'duration'.
 * 2. If container_duration / reference_span > scale_mode_threshold, return
 *    'scale'.
 * 3. Otherwise return 'position'.
 *
 * This function is exposed primarily for testing and for consumers who want
 * to reason about mode selection without going through `computeMoment`.
 *
 * @param start - the resolved container start
 * @param end - the resolved container end
 * @param now - the current instant
 * @param reference_span - the duration used as denominator for scale/duration
 * @param config - engine configuration
 * @returns the selected rendering mode
 */
export function selectRenderingMode(
  start: Instant,
  end: Instant,
  now: Instant,
  reference_span: Duration,
  config?: EngineConfig,
): RenderingMode;

/**
 * Compute the recommended tick rate for a container given its duration.
 *
 * Mapping:
 * - duration < 1 day → 'high'
 * - duration < 1 year → 'medium'
 * - duration < 1 century → 'low'
 * - else → 'static'
 *
 * @param container_duration - the total duration of the container
 * @returns the recommended tick rate
 */
export function computeTickRate(container_duration: Duration): TickRate;

/**
 * Convert a tick rate hint to a concrete millisecond interval. Callers
 * typically use this to set up update loops.
 *
 * Defaults:
 * - high: 5000ms (5 seconds)
 * - medium: 60000ms (1 minute)
 * - low: 3600000ms (1 hour)
 * - static: Infinity (the caller should not schedule updates)
 *
 * These are hints, not guarantees. Callers may choose different intervals
 * based on their own constraints (battery, animation needs).
 *
 * @param tick_rate - the tick rate hint
 * @returns a millisecond interval, or Infinity for 'static'
 */
export function tickRateToInterval(tick_rate: TickRate): number;

/**
 * Find the reference milestone in a set. Returns the milestone marked with
 * `is_reference: true`, or null if none exists. If multiple milestones are
 * marked, returns the first one found (callers should not rely on this;
 * they should enforce uniqueness themselves).
 *
 * @param milestones - the set of milestones
 * @returns the reference milestone, or null
 */
export function findReferenceMilestone(milestones: Milestone[]): Milestone | null;

/**
 * Compute the duration from the reference milestone to now. Returns null
 * if no reference milestone exists.
 *
 * @param now - the current instant
 * @param milestones - the user's milestones
 * @returns the reference span, or null
 */
export function computeReferenceSpan(now: Instant, milestones: Milestone[]): Duration | null;

// =============================================================================
// Open design questions (for implementation time)
// =============================================================================

/*
 * 1. Does `computeMoment` need to be pure of timezone concerns, or does the
 *    engine own timezone logic internally? Current sketch assumes the engine
 *    owns it via the config.timezone field. Alternative is to require the
 *    caller to pre-compute calendar bounds and pass them in, but that moves
 *    a lot of complexity to the consumer. Leaning toward engine-owns-it.
 *
 * 2. Should there be a separate `evaluateContainer` function that returns
 *    just the resolved bounds (start, end) without computing position or
 *    fraction? Useful for consumers who want to preview container ranges
 *    without the full compute. Probably yes, as a minor addition.
 *
 * 3. Does the engine need a way to express containers whose start or end is
 *    a *function* of the current instant in ways more complex than the five
 *    rule types? Currently no, and I don't want to add one unless a concrete
 *    use case forces it. The rule set is intentionally small.
 *
 * 4. Precision at deep-time scales. The fraction for "since the universe"
 *    is something like 3e-10. JavaScript numbers handle this fine, but
 *    consumers formatting percentages need to be careful. The engine returns
 *    the raw fraction; formatting (including switching to scientific
 *    notation or "approximately zero" copy) is the caller's responsibility.
 *
 * 5. The `metadata` generic parameter is a convenience for strongly-typed
 *    consumers. Unclear whether to keep it or just use `unknown` everywhere
 *    and require consumers to cast. Leaning keep-it for type safety; costs
 *    nothing at runtime.
 *
 * 6. The `fallback_reference_span` default of 30 years is arbitrary. It
 *    affects scale-mode rendering for anonymous users. Worth discussing
 *    whether a different default (or no fallback, yielding null fraction)
 *    is better. Current choice errs toward "always render something."
 */
