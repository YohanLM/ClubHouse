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

## Workflow

Each story is developed on a branch named `ID_xxx-short-name` and merged into `main` through a reviewed pull request.
