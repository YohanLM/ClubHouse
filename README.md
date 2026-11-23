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
| `npm run db:setup`        | Creates your local database and adds demo accounts, clubs and events |
| `npm run api`             | Starts the HTTP API used by the app (http://localhost:3000) |
| `npm run measure:calendar` | Measures the calendar load time with 100 events (NFR ID_033, see `docs/nfr-ID_033-calendar-load-time.md`) |

## Running the API

The app cannot use Prisma directly, so it calls the services through a small HTTP API (`backend/src/api/`).

```bash
npm run db:setup   # once: local database + demo data
npm run api
```

- Demo accounts (password `Passw0rd!23`): `admin.clubhouse@mcgill.ca` (Administrator), `alice.tremblay@mail.mcgill.ca` and `bob.chen@mcgill.ca` (Users), `dana.lee@mail.mcgill.ca` (Club Owner of Robotics Club and Debate Union), `evan.roy@mail.mcgill.ca` (Club Owner of Jazz Society and Ski Club, inactive).
- Demo events (`backend/prisma/demoData.ts`): 6 upcoming scheduled events, 1 cancelled and 1 completed. Their dates are relative to the day you run `db:setup`, so run it again shortly before a demo on a fresh database (`backend/prisma/dev.db` deleted) to get dates that are still upcoming. Running it again on an existing database adds only what is missing.
- `POST /login` with `{ "email", "password" }` returns `{ token, session }`. Send the token in an `Authorization: Bearer <token>` header in the next requests.
- `GET /clubs` returns `{ clubs }` (active clubs in alphabetical order), or `401 { message: "Login required" }`.
- `POST /clubs/:clubId/follow` follows the club and returns `{ message, clubId, followerCount }` (`Club followed`, or `Club already followed` when it was already followed). Errors: `401 Login required`, `404 Club not found`, `400 Club is inactive`.
- `GET /follows` returns `{ clubIds }`, the ids of the clubs the logged-in user follows.
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

Runs the tests in `backend/tests/`. Prisma is mocked, so no database is needed. HTTP API tests use a local server through Supertest and require permission to connect to localhost.

### Acceptance tests (Cucumber)

```bash
npm run test:acceptance
```

- Runs all feature files in `features/`, including the Sprint B stories listed below. Scenario Outline rows run as separate test cases.
- Uses a separate SQLite test database (`test.db`), created automatically. Your local database is never touched.
- All tables are cleared before each scenario.
- Each scenario name starts with its story ID (`ID_xxx_<scenario>`). The output lists every test on its own line (`✔ ID_xxx_<scenario>`), grouped by feature file, so it shows which story and scenario each test checks.
- A successful run reports every scenario as passed. Undefined steps cause a nonzero exit code and need matching TypeScript definitions.
- An HTML report is also written to `reports/cucumber.html` (uploaded as an artifact by CI).

### Sprint B stories

| Story | Behavior | Feature file in `features/` |
|-------|----------|-------------------------------|
| ID_009 | Search clubs by keyword or category | `ID_009_Search_Clubs.feature` |
| ID_010 | View a club page and its events | `ID_010_View_Club_Page.feature` |
| ID_011 | Follow an active club and handle duplicate follows | `ID_011_Follow_Club.feature` |
| ID_016 | Edit event details with ownership, status and capacity rules | `ID_016_Edit_Event.feature` |
| ID_017 | Cancel a scheduled event with an optional reason | `ID_017_Cancel_Event.feature` |
| ID_019 | View upcoming scheduled events with date and followed-club filters | `ID_019_View_Upcoming_Events_Calendar.feature` |
| ID_020 | Save or change an RSVP and enforce event availability and capacity | `ID_020_RSVP_to_Event.feature` |

Run `npm run test:acceptance` to include all these stories. To run one feature, first prepare the test database, then select its filename. These commands work from the repo root in PowerShell and Bash.

```bash
npm exec --workspace=features -- cross-env DATABASE_URL=file:./test.db prisma db push --schema=../backend/prisma/schema.prisma
npm exec --workspace=features -- cross-env DATABASE_URL=file:./test.db NODE_OPTIONS=--import=tsx cucumber-js --import "support/**/*.ts" --import "step_definitions/**/*.ts" ID_016_Edit_Event.feature
```

Replace `ID_016_Edit_Event.feature` with any filename in the table, or supply several filenames separated by spaces. Keep both import patterns so shared setup, hooks and assertions load.

In this checkout, ID_009 and ID_010 still have undefined steps. Their Gherkin files are present, and the full acceptance run reports them as undefined until their step definitions are implemented.

### Shared event validation (T092 and T095)

`backend/src/services/eventValidation.ts` contains the field validation used by both `createEvent` and `editEvent`. It checks required fields, calendar dates, Montreal's current date, time format and ordering, and optional positive integer capacity. Services trim supplied fields before validation. Editing merges omitted fields with stored values and allows an unchanged past date. Passing `capacity: null` removes a capacity limit.

Run the validator tests, service regression checks and existing create-event tests together.

```bash
npm test --workspace=backend -- --runInBand eventValidation.test.ts eventValidationServices.test.ts createEvent.test.ts
```

Other existing Sprint B service tests can be selected the same way.

```bash
npm test --workspace=backend -- --runInBand cancelEvent.test.ts getCalendar.test.ts rsvpToEvent.test.ts listFollowedClubs.test.ts
```

### Everything at once

```bash
npm run build
```

Compiles the backend, typechecks the app, then runs the unit tests and the acceptance tests. Use `npm run typecheck` to also typecheck the step definitions.

### CI

GitHub Actions (`.github/workflows/ci.yml`) runs the build, the unit tests and the acceptance tests on every pull request and on every push to `main`. Results are in the Actions tab and on each PR.

### If something fails

- `@prisma/client did not initialize` or missing Prisma types: run `npx prisma generate --schema backend/prisma/schema.prisma`, then try again.
- Undefined steps: make sure you are on the latest `main` (`git pull`).

## Workflow

Each story is developed on a branch named `ID_xxx-short-name` and merged into `main` through a reviewed pull request.
