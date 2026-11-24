# Verification of ID_020 – RSVP to Event (T085)

Verified on 2026-11-23, on `main` at `96f7043` plus the T065 commit.

**Result: verified.** Every scenario of `features/ID_020_RSVP_to_Event.feature` passes. The HTTP API, run on the demo data, gives the same results. Two problems were found and fixed in this task (section 4). Two limitations remain (section 5).

## 1. Acceptance tests (Cucumber)

```bash
npm exec --workspace=features -- cross-env DATABASE_URL=file:./test.db prisma db push --schema=../backend/prisma/schema.prisma
npm exec --workspace=features -- cross-env DATABASE_URL=file:./test.db NODE_OPTIONS=--import=tsx cucumber-js --import "support/**/*.ts" --import "step_definitions/**/*.ts" ID_020_RSVP_to_Event.feature
```

**7 scenarios (7 passed), 50 steps (50 passed).**

| Scenario | Expected message | Result |
|---|---|---|
| ID_020_RSVP to an upcoming event: Attending (Normal Flow) | RSVP saved, 1 attendee | Passed |
| ID_020_RSVP to an upcoming event: Not Attending (Normal Flow) | RSVP saved, 0 attendees | Passed |
| ID_020_Change an existing RSVP (Alternate Flow) | RSVP saved, 0 attendees | Passed |
| ID_020_Attempt to RSVP to an event that cannot be attended: Robotics Kickoff (Error Flow) | Event has already taken place | Passed |
| ID_020_Attempt to RSVP to an event that cannot be attended: Demo Night (Error Flow) | Event is cancelled | Passed |
| ID_020_Attempt to RSVP to an event that has reached its capacity (Error Flow) | Event is full | Passed |
| ID_020_Attempt to RSVP with an invalid response (Error Flow) | Invalid RSVP response | Passed |

The full run (`npm run test:acceptance`) also passes for every other story with step definitions. Its only undefined scenarios are those of ID_009 and ID_010, as stated in the README.

## 2. Unit tests (Jest)

```bash
npm test --workspace=backend -- --runInBand rsvpToEvent
```

**36 tests passed** (`rsvpToEvent.test.ts` and `rsvpToEvent.api.test.ts`). They cover the paths the feature file does not:

- login required, and an account that no longer exists
- event not found, and malformed event ids in the URL (`abc`, `0`, `-1`, `1.5`, too large)
- an event taking place today is accepted, and an event dated before today is rejected
- spelling of the response (`Attending`, `not attending`, missing or blank)
- a full event still lets an existing attendee keep their RSVP, and lets anyone decline
- the HTTP status of every error: `401` login, `404` not found, `400` for the other rules

The whole backend suite passes (`npm test`: 17 suites, 310 tests), and `npm run typecheck` reports no errors.

## 3. End-to-end check of the API on the demo data

The API (`npm run api`) was started on a fresh copy of the demo database (`db:setup`), and the requests the Events screen (`app/src/screens/EventsScreen.tsx`) sends were made with `curl`:

| Request | Response |
|---|---|
| Alice: Attending, Robotics Workshop | `200` RSVP saved, 1 attendee |
| Alice: changes to Not Attending | `200` RSVP saved, 0 attendees |
| Alice and Bob: Attending, Arduino Hack Night (capacity 2) | `200` RSVP saved, 1 then 2 attendees |
| Dana: Attending, Arduino Hack Night (full) | `400` Event is full, no RSVP saved |
| Alice: Attending again, Arduino Hack Night (full) | `200` RSVP saved, still 2 attendees |
| Dana: Not Attending, Arduino Hack Night (full) | `200` RSVP saved, still 2 attendees |
| Response `Maybe` | `400` Invalid RSVP response |
| No login | `401` Login required |
| Event 999 | `404` Event not found |
| Demo Night (cancelled) | `400` Event is cancelled |
| Robotics Kickoff (completed) | `400` Event has already taken place |

Afterwards, `GET /events/calendar` showed the updated attendee counts.

## 4. Problems found and fixed

1. **Scenario names had no story ID.** The README says every scenario starts with its story ID (`ID_xxx_<scenario>`), so test output shows which story each test checks. The ID_020 scenarios now start with `ID_020_`. (ID_009, ID_010 and ID_019 have the same problem. They are outside this task.)
2. **The RSVP route had few tests.** Only one error was checked. Tests were added for the status of every error, a missing login, a response that is not a string, and malformed event ids.

## 5. Remaining limitations (not required by the feature file)

- **Capacity under concurrent requests.** `rsvpToEvent` counts the attendees and then saves the RSVP, in two separate steps. Two users taking the last place at the same moment could both be accepted. Running both steps in one transaction would fix it.
- **The app does not show the user's own RSVP.** The Events screen shows the attendee count, but not whether the logged-in user is attending, because `GET /events/calendar` does not return it.
