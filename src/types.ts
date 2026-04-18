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
