# moment-engine

Express the current moment as a fraction of nested time containers — hours, decades, the age of the universe.

[![npm](https://img.shields.io/npm/v/moment-engine.svg)](https://www.npmjs.com/package/moment-engine) [![CI](https://github.com/homeforderangedscientists/moment-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/homeforderangedscientists/moment-engine/actions/workflows/ci.yml)

`moment-engine` is a zero-dependency, framework-agnostic TypeScript library. Given a set of time containers (this hour, this year, since the dinosaurs) and a current instant, it returns a list of computed "moments" where each moment expresses the present as a fraction of its container.

Pure functions over data. Time is always injected. Render any way you want.

## Install

```bash
npm install moment-engine
# or
pnpm add moment-engine
```

## Quick start

```ts
import { computeMoments, type Container } from 'moment-engine';

const containers: Container[] = [
  {
    id: 'this-year',
    start: { type: 'calendar_start', period: 'year' },
    end: { type: 'calendar_end', period: 'year' },
  },
  {
    id: 'since-big-bang',
    start: { type: 'years_before_present', years: 13.8e9 },
    end: { type: 'now' },
  },
];

const moments = computeMoments(containers, Date.now(), []);

for (const m of moments) {
  console.log(`${m.container_id} (${m.rendering_mode}): ${(m.fraction * 100).toFixed(6)}%`);
}
```

## Concepts

- **Container:** a time range defined by start/end rules. E.g. "this year," "the 2020s," "since the dinosaurs."
- **Moment:** the computed state of a container at a specific instant — bounds, position, fraction, rendering mode.
- **Rule:** a declarative start/end specification. Seven rule types cover every envisioned container: `absolute`, `years_before_present`, `calendar_start`, `calendar_end`, `milestone`, `milestone_offset`, `now`.
- **Rendering mode:** how a tile should be visually presented — `position`, `scale`, or `duration`. Selected by container geometry.

See the [API reference](https://homeforderangedscientists.github.io/moment-engine/) or read the source — every exported type and function is annotated.

## License

MIT
