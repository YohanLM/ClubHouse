# ClubHouse

Centralized event calendar for McGill student clubs. ECSE 428 Team 5.

## Structure

| Folder      | Contents |
|-------------|----------|
| `app/`      | Mobile app (Expo + TypeScript, iOS and Android) |
| `backend/`  | Service layer (Node + TypeScript), unit tests in `backend/tests/` (Jest) |
| `features/` | Gherkin feature files (`ID_xxx_<Name>.feature`) and Cucumber-js step definitions |

## Setup

Requires Node 22 (see `.nvmrc`).

```bash
npm install
```

Prisma uses `backend/prisma/.env` for the local SQLite database. Acceptance tests override it with a separate `test.db` and clear events, clubs, and accounts before each scenario.

## Commands (run from the repo root)

| Command                   | What it does |
|---------------------------|--------------|
| `npm run build`           | Full build: compile, unit tests, then acceptance tests |
| `npm run compile`         | Compiles the backend and typechecks the app only |
| `npm run typecheck`       | Typechecks backend, app and step definitions |
| `npm test`                | Runs the backend unit tests |
| `npm run test:acceptance` | Runs the acceptance tests (Cucumber, set up in T003) |
| `npm run app`             | Starts the Expo dev server |

## Running the tests

Run everything from the repo root, after `npm install`.

### Unit tests (Jest)

```bash
npm test
```

Runs the tests in `backend/tests/`. Prisma is mocked, so no database is needed.

### Acceptance tests (Cucumber)

```bash
npm run test:acceptance
```

- Runs the 5 feature files in `features/` (19 scenarios, 39 once Scenario Outline examples are expanded).
- Uses a separate SQLite test database (`test.db`), created automatically. Your local database is never touched.
- All tables are cleared before each scenario.
- Each scenario name starts with its story ID (`ID_xxx_<scenario>`), so the output shows which story each test belongs to.
- Expected result: `39 scenarios (39 passed)`.

### Everything at once

```bash
npm run build
```

Compiles the backend, then runs the unit tests and the acceptance tests.

### CI

GitHub Actions (`.github/workflows/ci.yml`) runs the build, the unit tests and the acceptance tests on every pull request and on every push to `main`. Results are in the Actions tab and on each PR.

### If something fails

- `@prisma/client did not initialize` or missing Prisma types: run `npx prisma generate --schema backend/prisma/schema.prisma`, then try again.
- Undefined steps: make sure you are on the latest `main` (`git pull`).

## Workflow

Each story is developed on a branch named `ID_xxx-short-name` and merged into `main` through a reviewed pull request.
