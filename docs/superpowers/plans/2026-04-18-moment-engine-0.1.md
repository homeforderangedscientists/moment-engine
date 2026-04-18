# moment-engine 0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `moment-engine` 0.1 to public npm — a zero-dependency, framework-agnostic TypeScript library that expresses the current instant as a fraction of nested time containers (hour, decade, age-of-universe), with a pipeline that self-lints, auto-publishes on GitHub Release, and answers "what's live?" precisely.

**Architecture:** Pure functions over data. Flat public API from `moment-engine` entry point. Types first, stubs second, implementation inside-out (rule evaluation → mode selection → moment composition). Dual ESM+CJS build via `tsup`. Vitest for tests. Release-please + conventional commits drive version bumps and changelog; GitHub Release event triggers npm publish with OIDC-signed provenance.

**Tech Stack:** TypeScript (strict, ES2022), `tsup` (build), `vitest` (test), `eslint` + `@typescript-eslint` (lint), `prettier` (format), `husky` + `lint-staged` (pre-commit), `@commitlint/cli` (commit gate), `typedoc` (API reference), `size-limit` (bundle gate), GitHub Actions (CI), `release-please` (release automation), npm trusted publishing with provenance.

**Source doctrines:** `docs/moment-engine-prd.md` (product/API contract), `docs/moment-engine-api.ts` (typed API sketch), `DEVOPS-PLAYBOOK-portable.md` (CI/CD approach adapted for an npm library).

---

## Decisions locked before coding

- **Package manager:** `pnpm`. Smaller lockfile, faster installs, better monorepo-friendliness for the two consuming apps via `file:` protocol.
- **Node engine:** `">=20"` in `package.json`. Node 20 is LTS through April 2026; Node 18 EOL is April 2025.
- **Build tool:** `tsup` (esbuild under the hood). Emits `dist/index.mjs` + `dist/index.cjs` + `dist/index.d.ts` + sourcemaps from a single config. Zero runtime deps for the library itself.
- **Module layout:** single flat entry point. Internally split into `types.ts`, `rules.ts`, `calendar.ts`, `modes.ts`, `ticks.ts`, `milestones.ts`, `moment.ts`, and a thin `index.ts` that re-exports the public surface.
- **Test runner:** `vitest`. Fast, ESM-native, TSDoc-compatible, Jest-compatible API.
- **npm scope:** try unscoped `moment-engine` first; fall back to `@hfds/moment-engine` if taken. Resolved in Task I6 before first publish.
- **Release cadence:** semver-ish during 0.x (minor bumps may break); strict semver from 1.0. Releases driven by release-please from conventional commits.
- **Default branch:** `develop` (integration); `main` is publish-only. Matches DevOps Playbook Phase 0. Set this _before_ wiring release-please (Gotcha #1).
- **Timezone policy:** rely on `Intl.DateTimeFormat` with the `timeZone` option. Pure JS, no extra deps. Covers DST, month-length, leap year, week start.
- **Year definition for deep time:** 365.25 days exactly. Documented in TSDoc on `years_before_present`.

## File structure

```
moment-engine/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                 # Phase G
│   │   ├── release.yml            # Phase H (release-please)
│   │   ├── publish.yml            # Phase H (trusted publishing)
│   │   └── docs.yml               # Phase I (typedoc to Pages)
│   └── dependabot.yml
├── src/
│   ├── types.ts                   # All public types
│   ├── calendar.ts                # Intl-backed period start/end
│   ├── rules.ts                   # evaluateRule
│   ├── modes.ts                   # selectRenderingMode
│   ├── ticks.ts                   # computeTickRate, tickRateToInterval
│   ├── milestones.ts              # findReferenceMilestone, computeReferenceSpan
│   ├── moment.ts                  # computeMoment, computeMoments
│   └── index.ts                   # Public re-exports
├── test/
│   ├── rules.test.ts
│   ├── calendar.test.ts
│   ├── modes.test.ts
│   ├── ticks.test.ts
│   ├── milestones.test.ts
│   ├── moment.test.ts
│   └── api-surface.test.ts        # Freezes public surface
├── docs/
│   ├── moment-engine-prd.md       # (already exists)
│   ├── moment-engine-api.ts       # (already exists)
│   └── superpowers/plans/…        # (this file)
├── .changeset/ or release-please-*  # Release automation config
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── eslint.config.js
├── .prettierrc.json
├── .editorconfig
├── .gitignore
├── .npmignore
├── .nvmrc
├── commitlint.config.js
├── .size-limit.json
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
└── .release-please-config.json
```

---

## Phase A — Foundations (repo, tooling, pre-commit)

### Task A1: Initialize git repo with develop + main

**Files:**

- Create: `/Users/seth/Documents/PROJECTS/HDS/moment-engine/.git/`

- [ ] **Step 1: Init repo, set default branch to `develop`**

```bash
cd /Users/seth/Documents/PROJECTS/HDS/moment-engine
git init -b develop
git commit --allow-empty -m "chore: initial commit"
```

- [ ] **Step 2: Create `main` from `develop`**

```bash
git branch main
git log --oneline --all
```

Expected: one commit visible on both branches.

- [ ] **Step 3: Add GitHub remote (placeholder OK — repo may be created later)**

```bash
git remote add origin git@github.com:homeforderangedscientists/moment-engine.git
git remote -v
```

Expected: origin fetch/push urls listed. If the GitHub repo doesn't exist yet, that's fine — remote is set for when it does.

- [ ] **Step 4: Commit**

No changes beyond initial; skip to A2.

---

### Task A2: Conventional commits + commitlint

**Files:**

- Create: `commitlint.config.js`
- Create: `package.json` (bootstrap only — full contents in A3)

- [ ] **Step 1: Bootstrap minimal package.json**

```bash
npm init -y
```

- [ ] **Step 2: Install commitlint dev deps**

```bash
pnpm add -D @commitlint/cli @commitlint/config-conventional
```

(If pnpm not installed: `npm i -g pnpm`.)

- [ ] **Step 3: Write commitlint config**

Create `commitlint.config.cjs` (note the `.cjs` extension — `package.json` will have `"type": "module"` in A3, and a `.js` file using `module.exports` throws `ReferenceError: module is not defined` under ESM):

```js
module.exports = {
  extends: ['@commitlint/config-conventional'],
};
```

- [ ] **Step 4: Verify**

```bash
echo "fix: test message" | npx commitlint
echo "Bad Message" | npx commitlint
```

Expected: first passes, second fails with `subject-case` and `type-enum` errors.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml commitlint.config.cjs
git commit -m "chore: add commitlint with conventional config"
```

> ⚠️ Gotcha: commit subjects must start lowercase. `fix(ci): Target main` fails. Put issue IDs in parens at end, not the start.

---

### Task A3: Fill out package.json for a library

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Replace package.json contents**

```json
{
  "name": "moment-engine",
  "version": "0.0.0",
  "description": "Compute the current moment as a ratio of nested time containers — hours, decades, the age of the universe.",
  "keywords": ["time", "moment", "calendar", "fraction", "ratio", "duration", "clock"],
  "license": "MIT",
  "author": "Home For Deranged Scientists",
  "homepage": "https://github.com/homeforderangedscientists/moment-engine#readme",
  "bugs": "https://github.com/homeforderangedscientists/moment-engine/issues",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/homeforderangedscientists/moment-engine.git"
  },
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./package.json": "./package.json"
  },
  "files": ["dist", "README.md", "CHANGELOG.md", "LICENSE"],
  "sideEffects": false,
  "engines": { "node": ">=20" },
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:ci": "vitest run --coverage",
    "lint": "eslint . --max-warnings=0",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "size": "size-limit",
    "docs": "typedoc",
    "prepublishOnly": "pnpm run build",
    "prepare": "husky || true"
  }
}
```

- [ ] **Step 2: Write .nvmrc**

```bash
echo "20" > .nvmrc
```

- [ ] **Step 3: Commit**

```bash
git add package.json .nvmrc
git commit -m "chore: configure package.json for library publish"
```

> ⚠️ `version` starts at `0.0.0`. release-please will propose the first real bump (Phase H). Do NOT hand-edit further — the file becomes release-please's output.

---

### Task A4: TypeScript config

**Files:**

- Create: `tsconfig.json`

- [ ] **Step 1: Install TypeScript**

```bash
pnpm add -D typescript @types/node
```

- [ ] **Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 3: Verify it typechecks an empty src**

```bash
mkdir -p src
echo "export {};" > src/index.ts
pnpm typecheck
```

Expected: exit code 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add tsconfig.json src/index.ts package.json pnpm-lock.yaml
git commit -m "chore: configure strict TypeScript for ES2022"
```

---

### Task A5: tsup build config

**Files:**

- Create: `tsup.config.ts`

- [ ] **Step 1: Install tsup**

```bash
pnpm add -D tsup
```

- [ ] **Step 2: Write tsup.config.ts**

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  outExtension: ({ format }) => ({ js: format === 'esm' ? '.mjs' : '.cjs' }),
  treeshake: true,
});
```

- [ ] **Step 3: Verify build emits expected outputs**

```bash
pnpm build
ls dist/
```

Expected: `index.mjs`, `index.cjs`, `index.d.ts`, plus `.map` files.

- [ ] **Step 4: Commit**

```bash
git add tsup.config.ts package.json pnpm-lock.yaml
git commit -m "build: add tsup dual ESM+CJS build"
```

---

### Task A6: Vitest config + coverage

**Files:**

- Create: `vitest.config.ts`

- [ ] **Step 1: Install vitest + coverage**

```bash
pnpm add -D vitest @vitest/coverage-v8
```

- [ ] **Step 2: Write vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
});
```

- [ ] **Step 3: Create a trivial passing test to prove wiring**

Create `test/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('arithmetic still works', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run**

```bash
pnpm test:ci
```

Expected: 1 passing test. Coverage thresholds will fail because `src/` has only an empty re-export — that's OK; we'll satisfy them as implementation lands. To avoid a red CI until then, lower thresholds to 0 here in Task A6 and raise them in Task F-final. Update the four `thresholds` values to `0` for now.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts test/smoke.test.ts package.json pnpm-lock.yaml
git commit -m "test: add vitest with coverage wiring"
```

---

### Task A7: ESLint + Prettier + EditorConfig

**Files:**

- Create: `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.editorconfig`

- [ ] **Step 1: Install linting deps**

```bash
pnpm add -D eslint @eslint/js typescript-eslint prettier eslint-config-prettier
```

- [ ] **Step 2: Write `eslint.config.js` (flat config)**

```js
import js from '@eslint/js';
import ts from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...ts.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  prettier,
];
```

- [ ] **Step 3: Write `.prettierrc.json`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "arrowParens": "always"
}
```

- [ ] **Step 4: Write `.prettierignore`**

```
dist
coverage
node_modules
pnpm-lock.yaml
CHANGELOG.md
```

- [ ] **Step 5: Write `.editorconfig`**

```
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

- [ ] **Step 6: Verify**

```bash
pnpm lint
pnpm format
```

Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add eslint.config.js .prettierrc.json .prettierignore .editorconfig package.json pnpm-lock.yaml
git commit -m "chore: add eslint flat config + prettier + editorconfig"
```

---

### Task A8: Husky + lint-staged pre-commit

**Files:**

- Create: `.husky/pre-commit`, `.husky/commit-msg`, `lint-staged.config.js`

- [ ] **Step 1: Install**

```bash
pnpm add -D husky lint-staged
pnpm exec husky init
```

- [ ] **Step 2: Write `.husky/pre-commit`**

```sh
pnpm exec lint-staged
```

- [ ] **Step 3: Write `.husky/commit-msg`**

```sh
pnpm exec commitlint --edit "$1"
```

- [ ] **Step 4: Write `lint-staged.config.js`**

```js
export default {
  '*.{ts,js,json,md,yml,yaml}': ['prettier --write'],
  '*.{ts,js}': ['eslint --max-warnings=0'],
};
```

- [ ] **Step 5: Verify hooks fire**

```bash
chmod +x .husky/pre-commit .husky/commit-msg
echo "//bad" > src/scratch.ts
git add src/scratch.ts
git commit -m "wip scratch"   # should fail commitlint
git commit -m "chore: scratch" # should succeed; lint-staged runs prettier
rm src/scratch.ts
git add -A
git commit -m "chore: remove scratch"
```

Expected: the `wip scratch` commit is rejected by commit-msg hook. The `chore: scratch` commit succeeds and formatting runs.

- [ ] **Step 6: Commit**

```bash
git add .husky lint-staged.config.js package.json pnpm-lock.yaml
git commit -m "chore: add husky + lint-staged pre-commit gates"
```

---

### Task A9: .gitignore and .npmignore

**Files:**

- Create: `.gitignore`, `.npmignore`

- [ ] **Step 1: Write `.gitignore`**

```
node_modules
dist
coverage
.DS_Store
*.log
.env
.env.*
!.env.example
.vscode
.idea
```

- [ ] **Step 2: Write `.npmignore`**

The `files` field in package.json is the allowlist of record, but `.npmignore` provides defense-in-depth against accidental additions.

```
# Source — we only ship dist/
src
test
docs
.github
.husky
.changeset
node_modules
coverage

# Config — consumers don't need it
tsconfig.json
tsup.config.ts
vitest.config.ts
eslint.config.js
.prettierrc.json
.prettierignore
.editorconfig
commitlint.config.js
lint-staged.config.js
.size-limit.json
.release-please-*.json
.nvmrc

# Lockfiles + meta
pnpm-lock.yaml
.gitignore
```

- [ ] **Step 3: Verify package contents dry-run**

```bash
pnpm build
npm pack --dry-run
```

Expected: package contains ONLY `dist/*`, `README.md` (even empty for now), `CHANGELOG.md` (create an empty one if pack complains), `LICENSE` (same), `package.json`. No `src/`, `test/`, `.github/`, `docs/`.

- [ ] **Step 4: Create empty ship-required files**

```bash
touch README.md CHANGELOG.md LICENSE
```

- [ ] **Step 5: Commit**

```bash
git add .gitignore .npmignore README.md CHANGELOG.md LICENSE
git commit -m "chore: add .gitignore, .npmignore, and shipping file placeholders"
```

---

### Task A10: Push to origin + configure branch protection

**Files:** (no local files)

- [ ] **Step 1: Create the GitHub repo (if it doesn't exist)**

```bash
gh repo create homeforderangedscientists/moment-engine --public \
  --description "Express the current moment as a fraction of nested time containers" \
  --source=. --remote=origin --push
```

(If the remote already exists or you don't have `gh`, do the equivalent via the GitHub UI.)

- [ ] **Step 2: Push both branches**

```bash
git push -u origin develop
git push -u origin main
```

- [ ] **Step 3: Set `develop` as default branch**

```bash
gh repo edit homeforderangedscientists/moment-engine --default-branch develop
```

> ⚠️ **Gotcha #1:** release-please in Phase H will otherwise silently target `main` for PR source — this single step prevents hours of debugging later.

- [ ] **Step 4: Enable branch protection on `main`**

Via UI: Settings → Branches → Add rule for `main`:

- Require PR before merging
- Require conversation resolution
- Include administrators
- (Status checks added in Phase G when they exist)

- [ ] **Step 5: Enable "Allow GitHub Actions to create and approve pull requests"**

Settings → Actions → General → Workflow permissions → check "Allow GitHub Actions to create and approve pull requests".

- [ ] **Step 6: Commit**

No local changes.

---

## Phase B — Types and stubs (PRD step 2)

### Task B1: Copy the API sketch into `src/types.ts`

**Files:**

- Create: `src/types.ts`

- [ ] **Step 1: Copy type declarations only**

Extract from `docs/moment-engine-api.ts` every `export type`, `export interface`, and TSDoc comment for types. Drop function declarations. Save to `src/types.ts`. The final file exports: `Instant`, `Duration`, `Milestone`, `CalendarPeriod`, `Rule`, `TickRate`, `RenderingMode`, `Container`, `Moment`, `EngineConfig`. Preserve TSDoc comments verbatim.

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): add public type surface from API sketch"
```

---

### Task B2: Stubbed function exports

**Files:**

- Create: `src/rules.ts`, `src/modes.ts`, `src/ticks.ts`, `src/milestones.ts`, `src/moment.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write `src/rules.ts`**

```ts
import type { EngineConfig, Instant, Milestone, Rule } from './types.js';

export function evaluateRule(
  _rule: Rule,
  _now: Instant,
  _milestones: Milestone[],
  _config?: EngineConfig,
): Instant | null {
  throw new Error('evaluateRule: not implemented');
}
```

- [ ] **Step 2: Write `src/modes.ts`**

```ts
import type { Duration, EngineConfig, Instant, RenderingMode } from './types.js';

export function selectRenderingMode(
  _start: Instant,
  _end: Instant,
  _now: Instant,
  _referenceSpan: Duration,
  _config?: EngineConfig,
): RenderingMode {
  throw new Error('selectRenderingMode: not implemented');
}
```

- [ ] **Step 3: Write `src/ticks.ts`**

```ts
import type { Duration, TickRate } from './types.js';

export function computeTickRate(_containerDuration: Duration): TickRate {
  throw new Error('computeTickRate: not implemented');
}

export function tickRateToInterval(_tickRate: TickRate): number {
  throw new Error('tickRateToInterval: not implemented');
}
```

- [ ] **Step 4: Write `src/milestones.ts`**

```ts
import type { Duration, Instant, Milestone } from './types.js';

export function findReferenceMilestone(_milestones: Milestone[]): Milestone | null {
  throw new Error('findReferenceMilestone: not implemented');
}

export function computeReferenceSpan(_now: Instant, _milestones: Milestone[]): Duration | null {
  throw new Error('computeReferenceSpan: not implemented');
}
```

- [ ] **Step 5: Write `src/moment.ts`**

```ts
import type { Container, EngineConfig, Instant, Milestone, Moment } from './types.js';

export function computeMoment<M>(
  _container: Container<M>,
  _now: Instant,
  _milestones: Milestone[],
  _config?: EngineConfig,
): Moment<M> | null {
  throw new Error('computeMoment: not implemented');
}

export function computeMoments<M>(
  _containers: Container<M>[],
  _now: Instant,
  _milestones: Milestone[],
  _config?: EngineConfig,
): Moment<M>[] {
  throw new Error('computeMoments: not implemented');
}
```

- [ ] **Step 6: Replace `src/index.ts`**

```ts
export type {
  CalendarPeriod,
  Container,
  Duration,
  EngineConfig,
  Instant,
  Milestone,
  Moment,
  RenderingMode,
  Rule,
  TickRate,
} from './types.js';

export { evaluateRule } from './rules.js';
export { selectRenderingMode } from './modes.js';
export { computeTickRate, tickRateToInterval } from './ticks.js';
export { findReferenceMilestone, computeReferenceSpan } from './milestones.js';
export { computeMoment, computeMoments } from './moment.js';
```

- [ ] **Step 7: Verify typecheck + build**

```bash
pnpm typecheck && pnpm build
```

Expected: both exit 0. `dist/index.d.ts` exports every public name.

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat: stub public function surface"
```

---

### Task B3: API surface freeze test

**Files:**

- Create: `test/api-surface.test.ts`
- Modify: `test/smoke.test.ts` (delete — replaced)

- [ ] **Step 1: Delete smoke test**

```bash
rm test/smoke.test.ts
```

- [ ] **Step 2: Write API surface test**

```ts
import { describe, it, expect } from 'vitest';
import * as api from '../src/index.js';

describe('public API surface', () => {
  it('exports exactly the documented names', () => {
    const exported = Object.keys(api).sort();
    expect(exported).toEqual(
      [
        'computeMoment',
        'computeMoments',
        'computeReferenceSpan',
        'computeTickRate',
        'evaluateRule',
        'findReferenceMilestone',
        'selectRenderingMode',
        'tickRateToInterval',
      ].sort(),
    );
  });
});
```

- [ ] **Step 3: Run**

```bash
pnpm test:ci
```

Expected: passes. If a future task adds or renames a public export, this test fails — that's by design.

- [ ] **Step 4: Commit**

```bash
git add test
git commit -m "test: freeze public API surface"
```

---

## Phase C — Rule evaluation (PRD step 3)

> Implementation order: simplest rules first, calendar last. Every rule gets a dedicated test. We replace the single `evaluateRule` stub's throw with a `switch` statement that grows per task.

### Task C1: `absolute` rule

**Files:**

- Create: `test/rules.test.ts`
- Modify: `src/rules.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { evaluateRule } from '../src/rules.js';
import type { Rule } from '../src/types.js';

describe('evaluateRule', () => {
  const NOW = Date.UTC(2026, 3, 18, 12, 0, 0); // 2026-04-18T12:00:00Z

  describe('absolute', () => {
    it('returns the fixed date', () => {
      const rule: Rule = { type: 'absolute', date: Date.UTC(1969, 6, 20) };
      expect(evaluateRule(rule, NOW, [])).toBe(Date.UTC(1969, 6, 20));
    });
  });
});
```

- [ ] **Step 2: Run — expect fail**

```bash
pnpm vitest test/rules.test.ts
```

Expected: throws `evaluateRule: not implemented`.

- [ ] **Step 3: Implement minimal case**

Replace `src/rules.ts`:

```ts
import type { EngineConfig, Instant, Milestone, Rule } from './types.js';

export function evaluateRule(
  rule: Rule,
  _now: Instant,
  _milestones: Milestone[],
  _config?: EngineConfig,
): Instant | null {
  switch (rule.type) {
    case 'absolute':
      return rule.date;
    default:
      throw new Error(`evaluateRule: ${rule.type} not implemented`);
  }
}
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add src/rules.ts test/rules.test.ts
git commit -m "feat(rules): implement absolute rule"
```

---

### Task C2: `now` rule

**Files:**

- Modify: `src/rules.ts`, `test/rules.test.ts`

- [ ] **Step 1: Add failing test**

Append to `test/rules.test.ts`:

```ts
describe('now', () => {
  it('returns the evaluation instant', () => {
    expect(evaluateRule({ type: 'now' }, NOW, [])).toBe(NOW);
  });
});
```

- [ ] **Step 2: Implement**

In `src/rules.ts`, replace `_now` with `now` in the param list, and add a case:

```ts
    case 'now':
      return now;
```

- [ ] **Step 3: Run + commit**

```bash
pnpm vitest test/rules.test.ts
git add src/rules.ts test/rules.test.ts
git commit -m "feat(rules): implement now rule"
```

---

### Task C3: `years_before_present` rule

**Files:**

- Modify: `src/rules.ts`, `test/rules.test.ts`

- [ ] **Step 1: Add failing test**

```ts
describe('years_before_present', () => {
  it('subtracts years using 365.25 days', () => {
    const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
    expect(evaluateRule({ type: 'years_before_present', years: 1 }, NOW, [])).toBe(
      NOW - MS_PER_YEAR,
    );
  });

  it('handles deep time (13.8 billion years) without precision loss at year scale', () => {
    const result = evaluateRule({ type: 'years_before_present', years: 13.8e9 }, NOW, []);
    expect(result).not.toBeNull();
    expect(Number.isFinite(result!)).toBe(true);
    expect(result!).toBeLessThan(NOW);
  });
});
```

- [ ] **Step 2: Implement**

Add to switch in `src/rules.ts` — above the implementation, add a file-level constant:

```ts
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
```

Then the case:

```ts
    case 'years_before_present':
      return now - rule.years * MS_PER_YEAR;
```

- [ ] **Step 3: Run + commit**

```bash
pnpm vitest test/rules.test.ts
git add src/rules.ts test/rules.test.ts
git commit -m "feat(rules): implement years_before_present rule"
```

---

### Task C4: `milestone` rule

**Files:**

- Modify: `src/rules.ts`, `test/rules.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
describe('milestone', () => {
  const MS = [{ id: 'birth', label: 'Born', date: Date.UTC(1990, 0, 1) }];

  it('returns milestone date when found', () => {
    expect(evaluateRule({ type: 'milestone', milestone_id: 'birth' }, NOW, MS)).toBe(
      Date.UTC(1990, 0, 1),
    );
  });

  it('returns null when milestone missing', () => {
    expect(evaluateRule({ type: 'milestone', milestone_id: 'unknown' }, NOW, MS)).toBeNull();
  });
});
```

- [ ] **Step 2: Implement**

Replace `_milestones` with `milestones`; add case:

```ts
    case 'milestone': {
      const m = milestones.find((x) => x.id === rule.milestone_id);
      return m ? m.date : null;
    }
```

- [ ] **Step 3: Run + commit**

```bash
pnpm vitest test/rules.test.ts
git add src/rules.ts test/rules.test.ts
git commit -m "feat(rules): implement milestone rule with null on missing"
```

---

### Task C5: `milestone_offset` rule

**Files:**

- Modify: `src/rules.ts`, `test/rules.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
describe('milestone_offset', () => {
  const MS = [{ id: 'birth', label: 'Born', date: Date.UTC(1990, 0, 1) }];
  const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

  it('adds the offset', () => {
    expect(
      evaluateRule({ type: 'milestone_offset', milestone_id: 'birth', offset_years: 40 }, NOW, MS),
    ).toBe(Date.UTC(1990, 0, 1) + 40 * MS_PER_YEAR);
  });

  it('supports negative offsets', () => {
    expect(
      evaluateRule({ type: 'milestone_offset', milestone_id: 'birth', offset_years: -5 }, NOW, MS),
    ).toBe(Date.UTC(1990, 0, 1) - 5 * MS_PER_YEAR);
  });

  it('returns null when milestone missing', () => {
    expect(
      evaluateRule({ type: 'milestone_offset', milestone_id: 'unknown', offset_years: 5 }, NOW, MS),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Implement**

```ts
    case 'milestone_offset': {
      const m = milestones.find((x) => x.id === rule.milestone_id);
      return m ? m.date + rule.offset_years * MS_PER_YEAR : null;
    }
```

- [ ] **Step 3: Run + commit**

```bash
pnpm vitest test/rules.test.ts
git add src/rules.ts test/rules.test.ts
git commit -m "feat(rules): implement milestone_offset rule"
```

---

### Task C6: Calendar helper — `Intl`-backed period start

**Files:**

- Create: `src/calendar.ts`
- Create: `test/calendar.test.ts`

> This is the most load-bearing piece. We extract it into its own module so rules.ts stays thin.

- [ ] **Step 1: Write failing tests for `calendarPeriodStart`**

```ts
import { describe, it, expect } from 'vitest';
import { calendarPeriodStart, calendarPeriodEnd } from '../src/calendar.js';

describe('calendarPeriodStart', () => {
  it('hour: floors to top of hour (UTC)', () => {
    const t = Date.UTC(2026, 3, 18, 12, 34, 56, 789);
    expect(calendarPeriodStart(t, 'hour', 'UTC', 'monday')).toBe(
      Date.UTC(2026, 3, 18, 12, 0, 0, 0),
    );
  });

  it('day: floors to local midnight in timezone', () => {
    // 2026-04-18 02:30 UTC is 2026-04-17 22:30 America/New_York
    const t = Date.UTC(2026, 3, 18, 2, 30);
    // Local midnight NY = 04:00 UTC on 2026-04-17 (EDT, UTC-4)
    expect(calendarPeriodStart(t, 'day', 'America/New_York', 'monday')).toBe(
      Date.UTC(2026, 3, 17, 4, 0, 0, 0),
    );
  });

  it('week (ISO/monday): 2026-04-18 is Saturday, week starts Monday 2026-04-13', () => {
    const t = Date.UTC(2026, 3, 18, 12, 0);
    expect(calendarPeriodStart(t, 'week', 'UTC', 'monday')).toBe(Date.UTC(2026, 3, 13, 0, 0, 0, 0));
  });

  it('week (sunday start): 2026-04-18 Saturday → week starts 2026-04-12', () => {
    const t = Date.UTC(2026, 3, 18, 12, 0);
    expect(calendarPeriodStart(t, 'week', 'UTC', 'sunday')).toBe(Date.UTC(2026, 3, 12, 0, 0, 0, 0));
  });

  it('month: 1st day of month at local midnight', () => {
    const t = Date.UTC(2026, 3, 18, 12, 0);
    expect(calendarPeriodStart(t, 'month', 'UTC', 'monday')).toBe(Date.UTC(2026, 3, 1, 0, 0, 0, 0));
  });

  it('year: Jan 1 at local midnight', () => {
    const t = Date.UTC(2026, 3, 18, 12, 0);
    expect(calendarPeriodStart(t, 'year', 'UTC', 'monday')).toBe(Date.UTC(2026, 0, 1, 0, 0, 0, 0));
  });

  it('decade: floor to decade start (2020)', () => {
    const t = Date.UTC(2026, 3, 18);
    expect(calendarPeriodStart(t, 'decade', 'UTC', 'monday')).toBe(
      Date.UTC(2020, 0, 1, 0, 0, 0, 0),
    );
  });

  it('century: floor to century start (2000)', () => {
    const t = Date.UTC(2026, 3, 18);
    expect(calendarPeriodStart(t, 'century', 'UTC', 'monday')).toBe(
      Date.UTC(2000, 0, 1, 0, 0, 0, 0),
    );
  });

  it('millennium: floor to millennium start (2000)', () => {
    const t = Date.UTC(2026, 3, 18);
    expect(calendarPeriodStart(t, 'millennium', 'UTC', 'monday')).toBe(
      Date.UTC(2000, 0, 1, 0, 0, 0, 0),
    );
  });
});
```

- [ ] **Step 2: Run — expect fail (module not found)**

```bash
pnpm vitest test/calendar.test.ts
```

- [ ] **Step 3: Implement `src/calendar.ts`**

```ts
import type { CalendarPeriod, Instant } from './types.js';

type WeekStart = 'sunday' | 'monday';

interface Parts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 1=Mon..7=Sun (ISO)
}

function getParts(t: Instant, timeZone: string): Parts {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = fmt.formatToParts(new Date(t));
  const p: Record<string, string> = {};
  for (const part of parts) p[part.type] = part.value;
  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  const hour = p.hour === '24' ? 0 : Number(p.hour);
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour,
    minute: Number(p.minute),
    second: Number(p.second),
    weekday: weekdayMap[p.weekday ?? 'Mon'] ?? 1,
  };
}

// Find the UTC instant whose local time in `timeZone` matches the given parts.
// Uses a two-step iterative correction to handle DST transitions precisely.
function partsToInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Instant {
  const naive = Date.UTC(year, month - 1, day, hour, minute, second, 0);
  for (let i = 0; i < 2; i++) {
    const observed = getParts(naive, timeZone);
    const observedNaive = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second,
    );
    const delta = Date.UTC(year, month - 1, day, hour, minute, second) - observedNaive;
    if (delta === 0) return naive;
    return naive + delta;
  }
  return naive;
}

export function calendarPeriodStart(
  now: Instant,
  period: CalendarPeriod,
  timeZone: string,
  weekStart: WeekStart,
): Instant {
  const p = getParts(now, timeZone);
  switch (period) {
    case 'hour':
      return partsToInstant(p.year, p.month, p.day, p.hour, 0, 0, timeZone);
    case 'day':
      return partsToInstant(p.year, p.month, p.day, 0, 0, 0, timeZone);
    case 'week': {
      // weekday: 1=Mon..7=Sun
      const daysFromStart = weekStart === 'monday' ? p.weekday - 1 : p.weekday % 7;
      const dayStart = partsToInstant(p.year, p.month, p.day, 0, 0, 0, timeZone);
      const DAY_MS = 24 * 60 * 60 * 1000;
      return dayStart - daysFromStart * DAY_MS;
    }
    case 'month':
      return partsToInstant(p.year, p.month, 1, 0, 0, 0, timeZone);
    case 'year':
      return partsToInstant(p.year, 1, 1, 0, 0, 0, timeZone);
    case 'decade': {
      const decadeStart = Math.floor(p.year / 10) * 10;
      return partsToInstant(decadeStart, 1, 1, 0, 0, 0, timeZone);
    }
    case 'century': {
      const centuryStart = Math.floor(p.year / 100) * 100;
      return partsToInstant(centuryStart, 1, 1, 0, 0, 0, timeZone);
    }
    case 'millennium': {
      const millenniumStart = Math.floor(p.year / 1000) * 1000;
      return partsToInstant(millenniumStart, 1, 1, 0, 0, 0, timeZone);
    }
  }
}

export function calendarPeriodEnd(
  now: Instant,
  period: CalendarPeriod,
  timeZone: string,
  weekStart: WeekStart,
): Instant {
  // End = start of next period.
  const start = calendarPeriodStart(now, period, timeZone, weekStart);
  const p = getParts(start, timeZone);
  switch (period) {
    case 'hour':
      return partsToInstant(p.year, p.month, p.day, p.hour + 1, 0, 0, timeZone);
    case 'day':
      return partsToInstant(p.year, p.month, p.day + 1, 0, 0, 0, timeZone);
    case 'week': {
      const DAY_MS = 24 * 60 * 60 * 1000;
      return start + 7 * DAY_MS;
    }
    case 'month':
      return partsToInstant(p.year, p.month + 1, 1, 0, 0, 0, timeZone);
    case 'year':
      return partsToInstant(p.year + 1, 1, 1, 0, 0, 0, timeZone);
    case 'decade':
      return partsToInstant(p.year + 10, 1, 1, 0, 0, 0, timeZone);
    case 'century':
      return partsToInstant(p.year + 100, 1, 1, 0, 0, 0, timeZone);
    case 'millennium':
      return partsToInstant(p.year + 1000, 1, 1, 0, 0, 0, timeZone);
  }
}
```

- [ ] **Step 4: Run — expect all 9 tests pass**

```bash
pnpm vitest test/calendar.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/calendar.ts test/calendar.test.ts
git commit -m "feat(calendar): Intl-backed period start/end with DST-aware correction"
```

---

### Task C7: Calendar period tests across DST + leap boundaries

**Files:**

- Modify: `test/calendar.test.ts`

- [ ] **Step 1: Append DST + leap tests**

```ts
describe('calendar DST handling', () => {
  // US DST spring-forward 2026: 2026-03-08 02:00 local → 03:00 local
  it('day start in America/New_York on DST spring-forward day', () => {
    const t = Date.UTC(2026, 2, 8, 15, 0); // 11:00 EDT post-spring
    const start = calendarPeriodStart(t, 'day', 'America/New_York', 'monday');
    // Local midnight 2026-03-08 NY = 05:00 UTC (still EST before the jump)
    expect(start).toBe(Date.UTC(2026, 2, 8, 5, 0, 0, 0));
  });

  it('day start in America/New_York on DST fall-back day', () => {
    // 2026-11-01 02:00 local repeats
    const t = Date.UTC(2026, 10, 1, 15, 0);
    const start = calendarPeriodStart(t, 'day', 'America/New_York', 'monday');
    // Local midnight 2026-11-01 NY = 04:00 UTC (EDT before the fallback)
    expect(start).toBe(Date.UTC(2026, 10, 1, 4, 0, 0, 0));
  });

  it('month start on leap-year February 29', () => {
    const t = Date.UTC(2024, 1, 29, 12, 0); // 2024 is a leap year
    expect(calendarPeriodStart(t, 'month', 'UTC', 'monday')).toBe(Date.UTC(2024, 1, 1, 0, 0, 0, 0));
  });
});
```

- [ ] **Step 2: Run**

```bash
pnpm vitest test/calendar.test.ts
```

Expected: all pass. If DST cases fail, the Intl parts-to-instant loop in `partsToInstant` needs a third iteration — raise to 3.

- [ ] **Step 3: Commit**

```bash
git add test/calendar.test.ts
git commit -m "test(calendar): cover DST transitions and leap-year boundaries"
```

---

### Task C8: Wire calendar rules into `evaluateRule`

**Files:**

- Modify: `src/rules.ts`, `test/rules.test.ts`

- [ ] **Step 1: Add failing tests for calendar rules**

```ts
describe('calendar_start / calendar_end', () => {
  it('calendar_start year uses config timezone (UTC)', () => {
    const t = Date.UTC(2026, 3, 18, 12, 0);
    expect(
      evaluateRule({ type: 'calendar_start', period: 'year' }, t, [], { timezone: 'UTC' }),
    ).toBe(Date.UTC(2026, 0, 1, 0, 0, 0, 0));
  });

  it('calendar_end year uses config timezone (UTC)', () => {
    const t = Date.UTC(2026, 3, 18, 12, 0);
    expect(evaluateRule({ type: 'calendar_end', period: 'year' }, t, [], { timezone: 'UTC' })).toBe(
      Date.UTC(2027, 0, 1, 0, 0, 0, 0),
    );
  });

  it('calendar_start week honors week_start=sunday', () => {
    const t = Date.UTC(2026, 3, 18, 12, 0); // Saturday
    expect(
      evaluateRule({ type: 'calendar_start', period: 'week' }, t, [], {
        timezone: 'UTC',
        week_start: 'sunday',
      }),
    ).toBe(Date.UTC(2026, 3, 12, 0, 0, 0, 0));
  });
});
```

- [ ] **Step 2: Implement**

In `src/rules.ts`, add imports + defaults + cases:

```ts
import { calendarPeriodStart, calendarPeriodEnd } from './calendar.js';

function resolveTimezone(config?: EngineConfig): string {
  return config?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function resolveWeekStart(config?: EngineConfig): 'sunday' | 'monday' {
  return config?.week_start ?? 'monday';
}
```

Then inside the switch:

```ts
    case 'calendar_start':
      return calendarPeriodStart(now, rule.period, resolveTimezone(config), resolveWeekStart(config));
    case 'calendar_end':
      return calendarPeriodEnd(now, rule.period, resolveTimezone(config), resolveWeekStart(config));
```

- [ ] **Step 3: Run — expect all rule tests pass**

```bash
pnpm vitest
```

- [ ] **Step 4: Commit**

```bash
git add src/rules.ts test/rules.test.ts
git commit -m "feat(rules): wire calendar_start/calendar_end through Intl calendar"
```

---

### Task C9: Exhaustiveness + unknown rule type

**Files:**

- Modify: `src/rules.ts`, `test/rules.test.ts`

- [ ] **Step 1: Add exhaustiveness test**

```ts
describe('invalid input', () => {
  it('throws on unknown rule type (invalid input is a caller bug)', () => {
    const bogus = { type: 'asdf' } as unknown as Rule;
    expect(() => evaluateRule(bogus, NOW, [])).toThrow(/evaluateRule/);
  });
});
```

- [ ] **Step 2: Add exhaustive check**

Replace the switch default in `src/rules.ts`:

```ts
    default: {
      const _exhaustive: never = rule;
      throw new Error(`evaluateRule: unknown rule type: ${JSON.stringify(_exhaustive)}`);
    }
```

- [ ] **Step 3: Run + commit**

```bash
pnpm vitest
git add src/rules.ts test/rules.test.ts
git commit -m "feat(rules): exhaustive switch + throw on unknown rule"
```

---

## Phase D — Mode selection and tick rate

### Task D1: `selectRenderingMode` — duration case

**Files:**

- Create: `test/modes.test.ts`
- Modify: `src/modes.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { selectRenderingMode } from '../src/modes.js';

describe('selectRenderingMode', () => {
  const NOW = Date.UTC(2026, 3, 18);
  const YEAR = 365.25 * 24 * 60 * 60 * 1000;

  it('returns duration when end === now', () => {
    expect(selectRenderingMode(NOW - 10 * YEAR, NOW, NOW, 35 * YEAR)).toBe('duration');
  });

  it('treats near-now within 1s as duration', () => {
    expect(selectRenderingMode(NOW - 10 * YEAR, NOW - 500, NOW, 35 * YEAR)).toBe('duration');
  });
});
```

- [ ] **Step 2: Implement**

```ts
import type { Duration, EngineConfig, Instant, RenderingMode } from './types.js';

const NOW_EPSILON_MS = 1000;

export function selectRenderingMode(
  start: Instant,
  end: Instant,
  now: Instant,
  referenceSpan: Duration,
  config?: EngineConfig,
): RenderingMode {
  if (Math.abs(end - now) < NOW_EPSILON_MS) return 'duration';
  const threshold = config?.scale_mode_threshold ?? 100;
  const ratio = (end - start) / referenceSpan;
  if (ratio > threshold) return 'scale';
  return 'position';
}
```

- [ ] **Step 3: Run + commit**

```bash
pnpm vitest test/modes.test.ts
git add src/modes.ts test/modes.test.ts
git commit -m "feat(modes): selectRenderingMode with duration/scale/position"
```

---

### Task D2: `selectRenderingMode` — scale + position + threshold boundary

**Files:**

- Modify: `test/modes.test.ts`

- [ ] **Step 1: Add tests for scale and boundary**

```ts
it('returns scale when ratio exceeds threshold', () => {
  const hugeContainer = 1e6 * YEAR;
  expect(selectRenderingMode(NOW - hugeContainer, NOW + YEAR, NOW, 35 * YEAR)).toBe('scale');
});

it('returns position when ratio within threshold', () => {
  expect(selectRenderingMode(NOW - YEAR, NOW + YEAR, NOW, 35 * YEAR)).toBe('position');
});

it('boundary: ratio exactly at threshold → position (strict greater-than)', () => {
  const span = 10 * YEAR;
  // container duration = 100 * span → ratio = 100
  const end = NOW + YEAR;
  const start = end - 100 * span;
  expect(selectRenderingMode(start, end, NOW, span, { scale_mode_threshold: 100 })).toBe(
    'position',
  );
});

it('boundary: ratio slightly above threshold → scale', () => {
  const span = 10 * YEAR;
  const end = NOW + YEAR;
  const start = end - (100 * span + 1);
  expect(selectRenderingMode(start, end, NOW, span, { scale_mode_threshold: 100 })).toBe('scale');
});
```

- [ ] **Step 2: Run + commit**

```bash
pnpm vitest test/modes.test.ts
git add test/modes.test.ts
git commit -m "test(modes): cover scale/position and threshold boundary"
```

---

### Task D3: `computeTickRate` + `tickRateToInterval`

**Files:**

- Create: `test/ticks.test.ts`
- Modify: `src/ticks.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { computeTickRate, tickRateToInterval } from '../src/ticks.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const YEAR = 365.25 * DAY;
const CENTURY = 100 * YEAR;

describe('computeTickRate', () => {
  it('< 1 day → high', () => {
    expect(computeTickRate(HOUR)).toBe('high');
    expect(computeTickRate(DAY - 1)).toBe('high');
  });
  it('< 1 year → medium', () => {
    expect(computeTickRate(DAY)).toBe('medium');
    expect(computeTickRate(YEAR - 1)).toBe('medium');
  });
  it('< 1 century → low', () => {
    expect(computeTickRate(YEAR)).toBe('low');
    expect(computeTickRate(CENTURY - 1)).toBe('low');
  });
  it('≥ 1 century → static', () => {
    expect(computeTickRate(CENTURY)).toBe('static');
    expect(computeTickRate(13.8e9 * YEAR)).toBe('static');
  });
});

describe('tickRateToInterval', () => {
  it('maps to documented defaults', () => {
    expect(tickRateToInterval('high')).toBe(5_000);
    expect(tickRateToInterval('medium')).toBe(60_000);
    expect(tickRateToInterval('low')).toBe(3_600_000);
    expect(tickRateToInterval('static')).toBe(Infinity);
  });
});
```

- [ ] **Step 2: Implement**

```ts
import type { Duration, TickRate } from './types.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_MS = 365.25 * DAY_MS;
const CENTURY_MS = 100 * YEAR_MS;

export function computeTickRate(containerDuration: Duration): TickRate {
  if (containerDuration < DAY_MS) return 'high';
  if (containerDuration < YEAR_MS) return 'medium';
  if (containerDuration < CENTURY_MS) return 'low';
  return 'static';
}

export function tickRateToInterval(tickRate: TickRate): number {
  switch (tickRate) {
    case 'high':
      return 5_000;
    case 'medium':
      return 60_000;
    case 'low':
      return 3_600_000;
    case 'static':
      return Infinity;
  }
}
```

- [ ] **Step 3: Run + commit**

```bash
pnpm vitest test/ticks.test.ts
git add src/ticks.ts test/ticks.test.ts
git commit -m "feat(ticks): computeTickRate and tickRateToInterval"
```

---

## Phase E — Reference helpers

### Task E1: `findReferenceMilestone`

**Files:**

- Create: `test/milestones.test.ts`
- Modify: `src/milestones.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { findReferenceMilestone, computeReferenceSpan } from '../src/milestones.js';
import type { Milestone } from '../src/types.js';

describe('findReferenceMilestone', () => {
  it('returns the milestone with is_reference=true', () => {
    const ms: Milestone[] = [
      { id: 'a', label: 'A', date: 1 },
      { id: 'b', label: 'B', date: 2, is_reference: true },
    ];
    expect(findReferenceMilestone(ms)).toEqual(ms[1]);
  });

  it('returns null when no reference present', () => {
    expect(findReferenceMilestone([{ id: 'a', label: 'A', date: 1 }])).toBeNull();
  });

  it('returns the first when multiple are flagged', () => {
    const ms: Milestone[] = [
      { id: 'a', label: 'A', date: 1, is_reference: true },
      { id: 'b', label: 'B', date: 2, is_reference: true },
    ];
    expect(findReferenceMilestone(ms)?.id).toBe('a');
  });
});
```

- [ ] **Step 2: Implement**

```ts
import type { Duration, Instant, Milestone } from './types.js';

export function findReferenceMilestone(milestones: Milestone[]): Milestone | null {
  return milestones.find((m) => m.is_reference === true) ?? null;
}

export function computeReferenceSpan(now: Instant, milestones: Milestone[]): Duration | null {
  const ref = findReferenceMilestone(milestones);
  return ref ? now - ref.date : null;
}
```

- [ ] **Step 3: Run + commit**

```bash
pnpm vitest test/milestones.test.ts
git add src/milestones.ts test/milestones.test.ts
git commit -m "feat(milestones): findReferenceMilestone + computeReferenceSpan"
```

---

### Task E2: `computeReferenceSpan` additional cases

**Files:**

- Modify: `test/milestones.test.ts`

- [ ] **Step 1: Append tests**

```ts
describe('computeReferenceSpan', () => {
  it('returns now - reference.date', () => {
    const ms: Milestone[] = [{ id: 'b', label: 'Birth', date: 1000, is_reference: true }];
    expect(computeReferenceSpan(5000, ms)).toBe(4000);
  });

  it('returns null with no reference', () => {
    expect(computeReferenceSpan(5000, [])).toBeNull();
  });
});
```

- [ ] **Step 2: Run + commit**

```bash
pnpm vitest
git add test/milestones.test.ts
git commit -m "test(milestones): cover computeReferenceSpan"
```

---

## Phase F — Moment computation

### Task F1: `computeMoment` — position mode happy path

**Files:**

- Create: `test/moment.test.ts`
- Modify: `src/moment.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { computeMoment, computeMoments } from '../src/moment.js';
import type { Container } from '../src/types.js';

const YEAR = 365.25 * 24 * 60 * 60 * 1000;

describe('computeMoment — position mode', () => {
  it('computes bounds, position, fraction, tick for "this year"', () => {
    const now = Date.UTC(2026, 6, 1); // July 1 — roughly halfway
    const c: Container = {
      id: 'this-year',
      start: { type: 'calendar_start', period: 'year' },
      end: { type: 'calendar_end', period: 'year' },
    };
    const m = computeMoment(c, now, [], { timezone: 'UTC' });
    expect(m).not.toBeNull();
    expect(m!.container_id).toBe('this-year');
    expect(m!.start).toBe(Date.UTC(2026, 0, 1));
    expect(m!.end).toBe(Date.UTC(2027, 0, 1));
    expect(m!.container_duration).toBe(m!.end - m!.start);
    expect(m!.position).toBeGreaterThan(0.45);
    expect(m!.position).toBeLessThan(0.55);
    expect(m!.fraction).toBe(m!.position);
    expect(m!.rendering_mode).toBe('position');
    expect(m!.tick_rate).toBe('medium');
    expect(m!.reference_span).toBeNull();
  });
});
```

- [ ] **Step 2: Implement `computeMoment`**

Replace `src/moment.ts`:

```ts
import type { Container, EngineConfig, Instant, Milestone, Moment } from './types.js';
import { evaluateRule } from './rules.js';
import { selectRenderingMode } from './modes.js';
import { computeTickRate } from './ticks.js';
import { computeReferenceSpan } from './milestones.js';

const DEFAULT_FALLBACK_SPAN = 30 * 365.25 * 24 * 60 * 60 * 1000;

export function computeMoment<M>(
  container: Container<M>,
  now: Instant,
  milestones: Milestone[],
  config?: EngineConfig,
): Moment<M> | null {
  const start = evaluateRule(container.start, now, milestones, config);
  const end = evaluateRule(container.end, now, milestones, config);
  if (start === null || end === null) return null;

  const container_duration = end - start;
  const ref = computeReferenceSpan(now, milestones);
  const reference_span = ref ?? config?.fallback_reference_span ?? DEFAULT_FALLBACK_SPAN;

  const rendering_mode = selectRenderingMode(start, end, now, reference_span, config);

  const position =
    container_duration === 0 ? 1 : Math.max(0, Math.min(1, (now - start) / container_duration));

  let fraction: number;
  switch (rendering_mode) {
    case 'position':
      fraction = position;
      break;
    case 'scale':
      fraction = reference_span / container_duration;
      break;
    case 'duration':
      fraction = container_duration / reference_span;
      break;
  }

  return {
    container_id: container.id,
    start,
    end,
    container_duration,
    position,
    fraction,
    rendering_mode,
    tick_rate: computeTickRate(container_duration),
    reference_span: ref,
    ...(container.metadata !== undefined && { metadata: container.metadata }),
  };
}

export function computeMoments<M>(
  containers: Container<M>[],
  now: Instant,
  milestones: Milestone[],
  config?: EngineConfig,
): Moment<M>[] {
  const out: Moment<M>[] = [];
  for (const c of containers) {
    const m = computeMoment(c, now, milestones, config);
    if (m !== null) out.push(m);
  }
  return out;
}
```

- [ ] **Step 3: Run + commit**

```bash
pnpm vitest test/moment.test.ts
git add src/moment.ts test/moment.test.ts
git commit -m "feat(moment): computeMoment + computeMoments with position mode"
```

---

### Task F2: `computeMoment` — scale mode

**Files:**

- Modify: `test/moment.test.ts`

- [ ] **Step 1: Append test**

```ts
describe('computeMoment — scale mode', () => {
  it('fraction = reference_span / container_duration', () => {
    const now = Date.UTC(2026, 3, 18);
    const birth = now - 35 * YEAR;
    const c: Container = {
      id: 'since-universe',
      start: { type: 'years_before_present', years: 13.8e9 },
      end: { type: 'now' },
    };
    const m = computeMoment(c, now, [
      { id: 'birth', label: 'Born', date: birth, is_reference: true },
    ]);
    expect(m).not.toBeNull();
    // end=now → duration mode (because end === now)
    expect(m!.rendering_mode).toBe('duration');
    expect(m!.fraction).toBeCloseTo((35 * YEAR) / (13.8e9 * YEAR), 12);
  });

  it('deep past, end far from now → scale mode, fraction = ref/container', () => {
    const now = Date.UTC(2026, 3, 18);
    const birth = now - 35 * YEAR;
    const c: Container = {
      id: 'since-big-bang-to-next-year',
      start: { type: 'years_before_present', years: 13.8e9 },
      end: { type: 'absolute', date: now + YEAR },
    };
    const m = computeMoment(c, now, [
      { id: 'birth', label: 'Born', date: birth, is_reference: true },
    ]);
    expect(m!.rendering_mode).toBe('scale');
    expect(m!.fraction).toBeCloseTo((35 * YEAR) / m!.container_duration, 12);
  });
});
```

- [ ] **Step 2: Run + commit**

```bash
pnpm vitest test/moment.test.ts
git add test/moment.test.ts
git commit -m "test(moment): scale-mode fraction semantics"
```

---

### Task F3: `computeMoment` — metadata passthrough + null container

**Files:**

- Modify: `test/moment.test.ts`

- [ ] **Step 1: Append tests**

```ts
describe('computeMoment — metadata & unresolvable', () => {
  it('passes through metadata unchanged', () => {
    const now = Date.UTC(2026, 3, 18);
    const c: Container<{ label: string }> = {
      id: 'hour',
      start: { type: 'calendar_start', period: 'hour' },
      end: { type: 'calendar_end', period: 'hour' },
      metadata: { label: 'This hour' },
    };
    const m = computeMoment(c, now, [], { timezone: 'UTC' });
    expect(m!.metadata).toEqual({ label: 'This hour' });
  });

  it('returns null when start rule unresolvable', () => {
    const now = Date.UTC(2026, 3, 18);
    const c: Container = {
      id: 'x',
      start: { type: 'milestone', milestone_id: 'missing' },
      end: { type: 'now' },
    };
    expect(computeMoment(c, now, [])).toBeNull();
  });

  it('returns null when end rule unresolvable', () => {
    const now = Date.UTC(2026, 3, 18);
    const c: Container = {
      id: 'x',
      start: { type: 'now' },
      end: { type: 'milestone', milestone_id: 'missing' },
    };
    expect(computeMoment(c, now, [])).toBeNull();
  });
});

describe('computeMoments', () => {
  it('preserves order, filters nulls', () => {
    const now = Date.UTC(2026, 3, 18);
    const cs: Container[] = [
      {
        id: 'a',
        start: { type: 'calendar_start', period: 'year' },
        end: { type: 'calendar_end', period: 'year' },
      },
      { id: 'b', start: { type: 'milestone', milestone_id: 'missing' }, end: { type: 'now' } },
      {
        id: 'c',
        start: { type: 'calendar_start', period: 'day' },
        end: { type: 'calendar_end', period: 'day' },
      },
    ];
    const ms = computeMoments(cs, now, [], { timezone: 'UTC' });
    expect(ms.map((m) => m.container_id)).toEqual(['a', 'c']);
  });
});
```

- [ ] **Step 2: Run + commit**

```bash
pnpm vitest
git add test/moment.test.ts
git commit -m "test(moment): metadata passthrough, null handling, filter-preserving-order"
```

---

### Task F4: Restore coverage thresholds

**Files:**

- Modify: `vitest.config.ts`

- [ ] **Step 1: Raise thresholds back to documented values**

Edit `vitest.config.ts`:

```ts
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
```

- [ ] **Step 2: Run coverage**

```bash
pnpm test:ci
```

Expected: coverage report passes. If any threshold fails, add a test covering the gap before continuing — do NOT lower the threshold.

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "test: restore coverage thresholds to 85-90%"
```

---

## Phase G — CI (DevOps Phases 2–3)

### Task G1: Basic CI workflow

**Files:**

- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: CI

on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop, main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  workflow-lint:
    name: workflow-lint (actionlint)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - name: Run actionlint
        run: |
          bash <(curl -sSf https://raw.githubusercontent.com/rhysd/actionlint/v1.7.7/scripts/download-actionlint.bash)
          ./actionlint -color

  commitlint:
    name: commitlint
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with: { fetch-depth: 0 }
      - uses: pnpm/action-setup@fe02b34f77f8bc703788d5817da081398fad5dd2 # v4.0.0
        with: { version: 9 }
      - uses: actions/setup-node@1d0ff469b7ec7b3cb9d8673fde0c81c44821de2a # v4.2.0
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec commitlint --from=${{ github.event.pull_request.base.sha }} --to=${{ github.event.pull_request.head.sha }}

  test:
    name: typecheck + lint + test + build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: pnpm/action-setup@fe02b34f77f8bc703788d5817da081398fad5dd2 # v4.0.0
        with: { version: 9 }
      - uses: actions/setup-node@1d0ff469b7ec7b3cb9d8673fde0c81c44821de2a # v4.2.0
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm format:check
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test:ci
      - run: pnpm build
      - name: Verify package pack contents
        run: |
          npm pack --dry-run 2>&1 | tee pack.log
          grep -q "src/" pack.log && { echo "src/ leaked into pack"; exit 1; } || true

  audit:
    name: audit (dependencies)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: pnpm/action-setup@fe02b34f77f8bc703788d5817da081398fad5dd2 # v4.0.0
        with: { version: 9 }
      - uses: actions/setup-node@1d0ff469b7ec7b3cb9d8673fde0c81c44821de2a # v4.2.0
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --audit-level=high --prod

  secrets-scan:
    name: secrets-scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with: { fetch-depth: 0 }
      - uses: trufflesecurity/trufflehog@main
        with:
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
          extra_args: --only-verified

  size:
    name: bundle-size
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: pnpm/action-setup@fe02b34f77f8bc703788d5817da081398fad5dd2 # v4.0.0
        with: { version: 9 }
      - uses: actions/setup-node@1d0ff469b7ec7b3cb9d8673fde0c81c44821de2a # v4.2.0
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm size
```

- [ ] **Step 2: Lint the workflow locally**

```bash
bash <(curl -sSf https://raw.githubusercontent.com/rhysd/actionlint/v1.7.7/scripts/download-actionlint.bash)
./actionlint .github/workflows/ci.yml
```

Expected: zero findings. If findings appear, fix them — actionlint is almost always right.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add CI workflow with workflow-lint, test, audit, secrets-scan, size"
```

> ⚠️ **Gotchas:** (1) Secrets-scan uses `trufflesecurity/trufflehog@main` because they don't publish stable SHAs — the canonical exception. (2) `secrets-scan` on the initial commit may fail with "BASE and HEAD same" — set `base: develop` for PRs and skip on the initial push once.

---

### Task G2: size-limit config

**Files:**

- Create: `.size-limit.json`

- [ ] **Step 1: Install**

```bash
pnpm add -D size-limit @size-limit/preset-small-lib
```

- [ ] **Step 2: Write config**

```json
[
  {
    "path": "dist/index.mjs",
    "limit": "3 KB",
    "gzip": true
  },
  {
    "path": "dist/index.cjs",
    "limit": "3 KB",
    "gzip": true
  }
]
```

- [ ] **Step 3: Run**

```bash
pnpm build && pnpm size
```

Expected: both under 3 KB gzipped. If not, widen to 4 KB now but file a Linear ticket to investigate — the library should compress small.

- [ ] **Step 4: Commit**

```bash
git add .size-limit.json package.json pnpm-lock.yaml
git commit -m "ci: add size-limit with 3KB gzipped budget"
```

---

### Task G3: Dependabot

**Files:**

- Create: `.github/dependabot.yml`

- [ ] **Step 1: Write config**

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 10
    groups:
      dev-deps:
        dependency-type: development
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

- [ ] **Step 2: Commit**

```bash
git add .github/dependabot.yml
git commit -m "ci: add dependabot for npm + github-actions weekly"
```

---

### Task G4: Require CI on `main` branch protection

**Files:** (GitHub UI)

- [ ] **Step 1: Add required checks**

Settings → Branches → Edit `main` rule → Require status checks → select:

- `workflow-lint (actionlint)`
- `typecheck + lint + test + build`
- `audit (dependencies)`
- `secrets-scan`
- `bundle-size`

Also add the same rule for `develop`.

- [ ] **Step 2: Verify via dummy PR**

Push a branch, open a PR into `develop`, watch checks run and block merge until green.

---

## Phase H — Release automation (DevOps Phases 4–5)

### Task H1: release-please config + manifest

**Files:**

- Create: `.release-please-config.json`, `.release-please-manifest.json`

- [ ] **Step 1: Write `.release-please-config.json`**

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "packages": {
    ".": {
      "release-type": "node",
      "bump-minor-pre-major": true,
      "bump-patch-for-minor-pre-major": false,
      "changelog-path": "CHANGELOG.md",
      "include-v-in-tag": true,
      "draft": false,
      "prerelease": false
    }
  }
}
```

- [ ] **Step 2: Write `.release-please-manifest.json`**

```json
{ ".": "0.0.0" }
```

This must match `package.json` `version` exactly — release-please reads this as the source of truth.

- [ ] **Step 3: Commit**

```bash
git add .release-please-config.json .release-please-manifest.json
git commit -m "chore: add release-please config targeting 0.0.0 baseline"
```

---

### Task H2: release-please workflow with PAT

**Files:**

- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create a classic PAT**

In GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens. Scope to the `moment-engine` repo only. Permissions: Contents (read/write), Pull requests (read/write). Save as repo secret `RELEASE_PAT`.

> ⚠️ **Gotcha #5 (critical):** you _cannot_ use `GITHUB_TOKEN` here. Releases created with `GITHUB_TOKEN` do not trigger `release: [published]` workflows. The publish job in Task H3 will never fire.

- [ ] **Step 2: Write workflow**

```yaml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@a02a34c4d625f9be7cb89156071d8567266a2445 # v4.1.3
        with:
          token: ${{ secrets.RELEASE_PAT }}
          target-branch: main
          config-file: .release-please-config.json
          manifest-file: .release-please-manifest.json
```

- [ ] **Step 3: Run actionlint**

```bash
./actionlint .github/workflows/release.yml
```

Expected: no findings.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add release-please workflow with PAT and main target"
```

> ⚠️ **Gotcha #3:** `target-branch` MUST be an action input as shown. If you put it inside `.release-please-config.json` it's silently ignored.

---

### Task H3: npm trusted publishing workflow

**Files:**

- Create: `.github/workflows/publish.yml`

- [ ] **Step 1: Configure npm trusted publishing**

On npmjs.com, go to the package page (even if not yet published, create the placeholder org `hfds` if using scoped) → Settings → Trusted Publisher → Add GitHub Actions provider → specify:

- Repository: `homeforderangedscientists/moment-engine`
- Workflow filename: `publish.yml`
- Environment: `npm-publish` (see next step)

- [ ] **Step 2: Write workflow**

```yaml
name: Publish

on:
  release:
    types: [published]

permissions:
  contents: read
  id-token: write # Required for OIDC trusted publishing

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: npm-publish
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: pnpm/action-setup@fe02b34f77f8bc703788d5817da081398fad5dd2 # v4.0.0
        with: { version: 9 }
      - uses: actions/setup-node@1d0ff469b7ec7b3cb9d8673fde0c81c44821de2a # v4.2.0
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org/
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test:ci
      - run: pnpm build
      - name: Publish dry-run
        run: npm publish --dry-run --provenance --access public
      - name: Publish to npm
        run: npm publish --provenance --access public
```

- [ ] **Step 3: Create `npm-publish` environment in GitHub**

Settings → Environments → New environment → `npm-publish`. Add a deployment protection rule requiring approval. This prevents drive-by publishes.

- [ ] **Step 4: Lint + commit**

```bash
./actionlint .github/workflows/publish.yml
git add .github/workflows/publish.yml
git commit -m "ci: add publish workflow with OIDC trusted publishing + provenance"
```

> ⚠️ Trusted publishing via OIDC removes the need for `NPM_TOKEN` as a secret entirely. If your npm org doesn't support trusted publishing yet, fall back to a granular access token with `publish` scope, stored as `NPM_TOKEN`, and add `env: { NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }} }` to the publish step. Drop the `id-token: write` permission in that case.

---

### Task H4: Slack notification on failed CI + successful publish

**Files:**

- Modify: `.github/workflows/ci.yml`, `.github/workflows/publish.yml`

- [ ] **Step 1: Add Slack webhook secret**

Create webhook in Slack (Apps → Incoming Webhooks). Save to repo secret `SLACK_WEBHOOK_URL`.

- [ ] **Step 2: Append notify-on-failure job to ci.yml**

```yaml
ci-notify:
  name: ci-notify
  runs-on: ubuntu-latest
  if: failure() && github.ref == 'refs/heads/main' && github.event_name == 'push'
  needs: [workflow-lint, test, audit, secrets-scan, size]
  steps:
    - name: Slack failure notification
      env:
        WEBHOOK: ${{ secrets.SLACK_WEBHOOK_URL }}
        SHA: ${{ github.sha }}
        RUN_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
      run: |
        PAYLOAD=$(jq -n --arg sha "$SHA" --arg url "$RUN_URL" \
          '{text: (":rotating_light: CI failed on main: " + $sha + "\n" + $url)}')
        curl -s -X POST -H 'Content-Type: application/json' -d "$PAYLOAD" "$WEBHOOK"
```

- [ ] **Step 3: Append notify-on-success step to publish.yml**

Add after publish step:

```yaml
- name: Slack publish notification
  if: success()
  env:
    WEBHOOK: ${{ secrets.SLACK_WEBHOOK_URL }}
    VERSION: ${{ github.event.release.tag_name }}
  run: |
    PAYLOAD=$(jq -n --arg v "$VERSION" \
      '{text: (":package: Published moment-engine@" + $v + " to npm")}')
    curl -s -X POST -H 'Content-Type: application/json' -d "$PAYLOAD" "$WEBHOOK"
```

- [ ] **Step 4: actionlint + commit**

```bash
./actionlint .github/workflows/ci.yml .github/workflows/publish.yml
git add .github/workflows/
git commit -m "ci: notify Slack on main-branch CI failures and successful publishes"
```

> ⚠️ **Gotcha #11:** use `jq -n --arg` to build Slack JSON, NEVER `sed` or string interpolation — commit messages with quotes or backticks will otherwise break the payload.

---

## Phase I — Polish (DevOps Phase 8)

### Task I1: MIT LICENSE

**Files:**

- Modify: `LICENSE`

- [ ] **Step 1: Write license**

```
MIT License

Copyright (c) 2026 Home For Deranged Scientists

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Commit**

```bash
git add LICENSE
git commit -m "chore: add MIT LICENSE"
```

---

### Task I2: README with worked example

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Write README**

````markdown
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
````

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
- **Moment:** the computed state of a container at a specific instant — bounds, position (where now is inside), fraction (the meaningful quantity to display), rendering mode.
- **Rule:** a declarative start/end specification. Seven rule types cover every envisioned container: `absolute`, `years_before_present`, `calendar_start`, `calendar_end`, `milestone`, `milestone_offset`, `now`.
- **Rendering mode:** how a tile should be visually presented — `position`, `scale`, or `duration`. Selected by container geometry.

See the full [API reference](https://homeforderangedscientists.github.io/moment-engine/) or read the source — every exported type and function is annotated.

## License

MIT

````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with quick-start and concepts"
````

---

### Task I3: typedoc for API reference

**Files:**

- Create: `typedoc.json`, `.github/workflows/docs.yml`

- [ ] **Step 1: Install typedoc**

```bash
pnpm add -D typedoc
```

- [ ] **Step 2: Write `typedoc.json`**

```json
{
  "$schema": "https://typedoc.org/schema.json",
  "entryPoints": ["src/index.ts"],
  "out": "site",
  "readme": "README.md",
  "includeVersion": true,
  "excludeInternal": true,
  "excludePrivate": true
}
```

- [ ] **Step 3: Write `.github/workflows/docs.yml`**

```yaml
name: Docs

on:
  release:
    types: [published]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: pnpm/action-setup@fe02b34f77f8bc703788d5817da081398fad5dd2 # v4.0.0
        with: { version: 9 }
      - uses: actions/setup-node@1d0ff469b7ec7b3cb9d8673fde0c81c44821de2a # v4.2.0
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm docs
      - uses: actions/configure-pages@983d7736d9b0ae728b81ab479565c72886d7745b # v5.0.0
      - uses: actions/upload-pages-artifact@56afc609e74202658d3ffba0e8f6dda462b719fa # v3.0.1
        with: { path: site }
      - id: deployment
        uses: actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e # v4.0.5
```

- [ ] **Step 4: Verify locally**

```bash
pnpm docs
open site/index.html
```

Expected: every public export documented with its TSDoc.

- [ ] **Step 5: Enable GitHub Pages**

Settings → Pages → Source: GitHub Actions.

- [ ] **Step 6: Commit**

```bash
./actionlint .github/workflows/docs.yml
git add typedoc.json .github/workflows/docs.yml package.json pnpm-lock.yaml
git commit -m "docs: generate and deploy TSDoc site on release"
```

---

### Task I4: CONTRIBUTING.md

**Files:**

- Modify: `CONTRIBUTING.md`

- [ ] **Step 1: Write**

````markdown
# Contributing to moment-engine

## Setup

```bash
pnpm install
pnpm test
pnpm build
```
````

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

````

- [ ] **Step 2: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: CONTRIBUTING.md with setup, workflow, and rules"
````

---

### Task I5: CHANGELOG seed

**Files:**

- Modify: `CHANGELOG.md`

- [ ] **Step 1: Seed changelog**

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Initial release forthcoming. See `docs/moment-engine-prd.md` for scope.
```

release-please will rewrite this file on first release — the seed just keeps it valid markdown until then.

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: seed CHANGELOG.md"
```

---

### Task I6: Verify npm name availability

**Files:** (no local files)

- [ ] **Step 1: Check name**

```bash
npm view moment-engine 2>&1 | head -5
```

Expected: `E404 'moment-engine' is not in this registry` → name is free. If it returns package metadata, the name is taken.

- [ ] **Step 2a: If free**

Name stays `moment-engine` in `package.json`. No action needed.

- [ ] **Step 2b: If taken**

Rename to `@hfds/moment-engine`. Update:

- `package.json` `name` → `@hfds/moment-engine`
- Remove `access public` default (scoped packages default to private); keep the explicit `--access public` in publish.yml — already present.
- Update README install section.
- Update homepage/badges URLs if needed.

```bash
git add package.json README.md
git commit -m "chore: fall back to @hfds/moment-engine npm scope"
```

---

## Phase J — First release (PRD step 8)

### Task J1: Merge the develop branch into main

**Files:** (no local files)

- [ ] **Step 1: Open develop → main PR via CLI**

```bash
gh pr create --base main --head develop \
  --title "release: promote 0.1.0 candidate" \
  --body "Initial release of moment-engine. See docs/superpowers/plans/2026-04-18-moment-engine-0.1.md."
```

- [ ] **Step 2: Wait for all required checks to go green**

```bash
gh pr checks --watch
```

If anything fails, fix on develop, push, reopen the PR.

- [ ] **Step 3: Merge**

```bash
gh pr merge --squash --delete-branch=false
```

(Do NOT delete `develop`.)

---

### Task J2: Verify release-please PR appears

**Files:** (no local files)

- [ ] **Step 1: Wait ~30s after merge**

- [ ] **Step 2: Check for release PR**

```bash
gh pr list --state open
```

Expected: a PR titled `chore(main): release 0.1.0` opened by `github-actions[bot]` (with PAT author). Its body contains the generated changelog from conventional commits.

If no PR appears:

- Check `release.yml` run logs. Common cause: `target-branch` not in workflow YAML (see Gotcha #3).
- Check that the PAT in `RELEASE_PAT` has `contents: write` and `pull-requests: write` permissions.

- [ ] **Step 3: Review the generated changelog**

Spot-check that the commits from conventional-commit `feat:` and `fix:` messages appear under the right headings. If not, your commit messages weren't strict enough — fix them via `git commit --amend` on develop, push, and wait for release-please to re-propose.

---

### Task J3: Merge the release PR → GitHub Release published

**Files:** (no local files)

- [ ] **Step 1: Merge**

```bash
gh pr merge <PR_NUMBER> --squash
```

- [ ] **Step 2: Watch for GitHub Release creation**

```bash
gh release list
```

Expected: `v0.1.0` appears within ~30s.

- [ ] **Step 3: Watch publish.yml fire**

```bash
gh run list --workflow=publish.yml --limit 1
gh run watch
```

Expected: all steps green, npm registry updated.

- [ ] **Step 4: Verify on npm**

```bash
npm view moment-engine version
```

Expected: `0.1.0`.

- [ ] **Step 5: Smoke install in a scratch dir**

```bash
mkdir -p /tmp/me-smoke && cd /tmp/me-smoke
npm init -y
npm install moment-engine
node -e "import('moment-engine').then(m => console.log(Object.keys(m).sort()))"
```

Expected: prints the 8 public names.

- [ ] **Step 6: Smoke install in approximately / fractional-clock**

If consuming apps exist, swap their `file:../moment-engine` dependency for `"moment-engine": "^0.1.0"` in a branch, run their test suites, verify nothing regresses.

---

### Task J4: Retro

**Files:**

- Create: `docs/retros/2026-04-18-moment-engine-0.1.md`

- [ ] **Step 1: Invoke the retrospective skill**

```
Skill: retrospective
```

- [ ] **Step 2: Write the retro**

Cover:

- What shipped and why
- What surprised us (any rule that resisted the 5-rule model? DST weirdness? coverage gaps?)
- One sentence the next release can extract as a rule
- Open questions from the PRD (#1–6) — which are still open?

- [ ] **Step 3: Commit**

```bash
git add docs/retros/
git commit -m "docs: retro for 0.1.0"
```

---

## Self-review results

**Spec coverage:** Every item in PRD "Scope for 0.1 → Included" has a corresponding task: types (B1), functions (B2, C1–C9, D1–D3, E1–E2, F1–F3), calendar coverage (C6–C8), rule types (C1–C5, C8), error split invalid vs unresolvable (C9 + F3), release + changelog + README (H1–H4, I2, I4, I5), npm publish (H3, J3). Testing strategy categories (PRD §Testing) all appear: rule eval (C1–C9), moment computation (F1–F3), mode selection (D1–D2), tick rate (D3), edge cases (C9 + F3), timezone (C7, C8). Open PRD questions #1–6 are noted for Task J4 retro.

**Placeholder scan:** No TBDs, no "fill in later," no "similar to Task N." Every code block is complete. Every command has expected output or a clear go/no-go signal.

**Type consistency:** `Moment.metadata` is omitted via conditional spread in F1 to satisfy `exactOptionalPropertyTypes`; types in tests match `src/types.ts` imports exactly; `reference_span` in `Moment` is nullable (`Duration | null`) in both types file (B1) and implementation (F1).

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-18-moment-engine-0.1.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Before execution, the Linear backlog (Phase A–J issues) will be built from this plan so each task is trackable outside of Claude.
