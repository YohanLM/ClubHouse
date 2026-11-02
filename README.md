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
| `npm run db:setup`        | Creates your local database and adds demo accounts and clubs |
| `npm run api`             | Starts the HTTP API used by the app (http://localhost:3000) |

## Running the API

The app cannot use Prisma directly, so it calls the services through a small HTTP API (`backend/src/api/`).

```bash
npm run db:setup   # once: local database + demo data
npm run api
```

- Demo accounts (password `Passw0rd!23`): `admin.clubhouse@mcgill.ca` (Administrator), `alice.tremblay@mail.mcgill.ca` (User), `dana.lee@mail.mcgill.ca` (Club Owner, owns the demo clubs).
- `POST /login` with `{ "email", "password" }` returns `{ token, session }`. Send the token in an `Authorization: Bearer <token>` header in the next requests.
- `GET /clubs` returns `{ clubs }` (active clubs in alphabetical order), or `401 { message: "Login required" }`.
- Errors are returned as `{ message }` with a 4xx status, using the messages of the feature files.
- Sessions are kept in memory: log in again after restarting the API.
- To add a route for another service, add it in `backend/src/api/app.ts` and test it in `backend/tests/api.test.ts`.

### Running the app against the API

Start the API, then `npm run app` in a second terminal. The app calls `http://localhost:3000` by default (`app/src/api/client.ts`). On a phone or an Android emulator, `localhost` is the device itself, so give it your computer's address (same Wi-Fi network):

```bash
EXPO_PUBLIC_API_URL=http://192.168.0.12:3000 npm run app   # PowerShell: $env:EXPO_PUBLIC_API_URL="http://192.168.0.12:3000"; npm run app
```

Screens read the logged-in user from `useSession()` (`app/src/session.tsx`) and send `session.token` to the API.

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
- Each scenario name starts with its story ID (`ID_xxx_<scenario>`). The output lists every test on its own line (`✔ ID_xxx_<scenario>`), grouped by feature file, so it shows which story and scenario each test checks.
- Expected result: `39 scenarios (39 passed)`.
- An HTML report is also written to `reports/cucumber.html` (uploaded as an artifact by CI).

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
