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
npm ci
npm run prisma:generate --workspace=backend
```

Prisma uses `backend/prisma/.env` for the local SQLite database. Acceptance tests always override it with a separate `backend/prisma/test.db`, apply committed migrations, and clear events, clubs, and accounts before each scenario. The hooks refuse to delete fixtures unless the isolated database is selected. No development database is used by the acceptance runner.

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

## Acceptance tests

`npm run test:acceptance` executes the five feature files using real services and SQLite. Their 19 scenario/scenario-outline definitions expand to 39 executable examples and 220 steps. Each scenario name starts with its story ID. JSON and HTML reports are written to `reports/cucumber.json` and `reports/cucumber.html`; a failed, undefined or ambiguous step makes the command fail.

The runner starts Node with the `tsx` loader before importing TypeScript steps, which also works on Node 22 releases without native TypeScript support. The optional profile and event-capacity clauses fill one form: the service submits that form once before its first outcome assertion.

## Service behavior

The backend exports `createAccount`, `login`, `createClub`, `listClubs` and `createEvent`. Database access is injected as a Prisma client. `login` returns a public identity (`id`, `email`, `role`) that an application can store in its session; it never returns password hashes. This service layer does not implement HTTP authentication or a mobile login screen. Callers must obtain the actor ID from the authenticated session, never from submitted form data.

Five consecutive failed passwords lock an account for **15 minutes**. A successful login or an expired lock resets the counter. The duration is an implementation choice because the feature file does not specify it; `LOGIN_LOCK_MS` defines it. Login and event creation accept an injectable clock. Events compare dates in Montreal's time zone, rather than the runner's local date.

Creating a club checks the administrator's current database role, creates the club, and promotes a User owner in one transaction. Existing administrators keep their role. Event creation checks actual club ownership; browsing returns only active clubs in name order.
