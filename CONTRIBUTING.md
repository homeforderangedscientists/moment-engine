# Contributing to moment-engine

## Setup

```bash
pnpm install
pnpm test
pnpm build
```

## Workflow

1. Branch from `develop`. All feature PRs land on `develop`.
2. Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): description` with lowercase subject.
3. `develop → main` PRs trigger release-please and (after merge) publish automatically.

## Rules enforced by CI

- Prettier formatting
- ESLint (strict TS rules, max-warnings=0)
- TypeScript strict mode, exactOptionalPropertyTypes, noUncheckedIndexedAccess
- Vitest with 85–90% coverage floor
- actionlint on every workflow
- TruffleHog secret scan
- `pnpm audit --audit-level=high`
- size-limit: each dist entry under 3 KB gzipped
- Commitlint on every PR

## Testing philosophy

Time is always injected — never call `Date.now()` inside the engine. Every function is pure. Every rule type has a dedicated test. Timezone + DST edges are tested explicitly.

## Releasing

Releases are automated. Merge to `develop`, then to `main`. release-please opens a PR with a version bump and changelog entry. Merging that PR creates a GitHub Release, which triggers `publish.yml`, which publishes to npm with SLSA provenance.

Manual release is forbidden — the PAT and trusted publisher config exist for a reason.
