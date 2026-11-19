// Step definitions for ID_019 View Upcoming Events Calendar.
// Uses the shared steps for "... is logged in with role ...", "the following
// events exist:" and "the message ... is issued", and "the current date is ..."
// from ID_015 and "no user is logged in" from ID_002. Calls getCalendar.

import assert from 'node:assert/strict';
import { When, Then, type DataTable } from '@cucumber/cucumber';
import { prisma } from '../../backend/src/prisma.ts';
import { getCalendar, type CalendarEvent } from '../../backend/src/services/getCalendar.ts';
import type { ClubHouseWorld } from '../support/world.ts';

type CalendarWorld = ClubHouseWorld & {
  /** Set by "the current date is ..." (ID_015 steps). */
  today?: string;
  /** Events returned by the last calendar request (empty when it failed). */
  calendar?: CalendarEvent[];
};

async function requestCalendar(world: CalendarWorld, from?: string, to?: string) {
  assert.ok(world.today, 'The scenario must set "the current date is ..."');
  // Noon Montreal time on the scenario's "current date".
  const clock = () => new Date(`${world.today}T12:00:00-05:00`);
  const result = await getCalendar(
    { actorId: world.currentUser?.id ?? null, from, to },
    prisma,
    clock,
  );
  world.calendar = result.success ? result.events : [];
  world.message = result.success ? null : result.message;
}

function listedTitles(world: CalendarWorld): string[] {
  assert.ok(world.calendar, 'The calendar was not requested');
  return world.calendar.map((event) => event.title);
}

// ---------- When ----------

When('the user requests the events calendar', async function (this: CalendarWorld) {
  await requestCalendar(this);
});

When(
  'the user requests the events calendar from {string} to {string}',
  async function (this: CalendarWorld, from: string, to: string) {
    await requestCalendar(this, from, to);
  },
);

// ---------- Then ----------

// Columns: ClubName, Title, Date, Start. The rows must match the calendar
// exactly, in the same order.
Then(
  'the following events are listed in chronological order:',
  function (this: CalendarWorld, table: DataTable) {
    assert.ok(this.calendar, `The calendar was not returned (message: ${this.message})`);
    const actual = this.calendar.map((event) => ({
      ClubName: event.clubName,
      Title: event.title,
      Date: event.date,
      Start: event.startTime,
    }));
    assert.deepEqual(actual, table.hashes());
  },
);

Then('{int} events are listed', function (this: CalendarWorld, count: number) {
  assert.equal(listedTitles(this).length, count, `Listed: ${listedTitles(this).join(', ')}`);
});

Then('the event {string} is listed first', function (this: CalendarWorld, title: string) {
  assert.equal(listedTitles(this)[0], title);
});

Then('no events are listed', function (this: CalendarWorld) {
  assert.deepEqual(listedTitles(this), []);
});
