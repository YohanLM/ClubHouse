// Step definitions for ID_015 Create Event (T031).
// Uses the shared steps from T007 for "... is logged in with role ..." and
// "the message ... is issued".
//
// createEvent (T030) is called in one place, submitEvent() below:
//   createEvent(input, actorId, prisma, now)
// If T030's signature differs, only submitEvent() needs to change.

import assert from 'node:assert/strict';
import { Before, BeforeStep, Given, When, Then } from '@cucumber/cucumber';
import { prisma } from '../../backend/src/prisma.ts';
import { createEvent } from '../../backend/src/index.ts';
import type { ClubHouseWorld } from '../support/world.ts';
import { upsertAccount } from './shared.steps.ts';

interface EventForm {
  clubName: string;
  title: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number | null;
}

// Extra per-scenario state for this feature.
type EventWorld = ClubHouseWorld & {
  today?: string;
  /** Form filled in by the When steps, submitted before the first Then step. */
  pendingEvent?: EventForm;
};

async function findClub(name: string) {
  const club = await prisma.club.findUnique({ where: { name } });
  assert.ok(club, `Club "${name}" does not exist`);
  return club;
}

async function submitEvent(world: EventWorld, form: EventForm) {
  // Noon Montreal time on the scenario's "current date".
  const now = () => new Date(`${world.today}T12:00:00-04:00`);
  const result = await createEvent(form, world.currentUser?.id ?? null, prisma, now);
  world.message = result.message;
}

Before(function (this: EventWorld) {
  this.pendingEvent = undefined;
});

// "When the user creates an event ..." and "And the user sets the capacity ..."
// fill in one form. It is submitted right before the first Then/And-after-Then
// step, so the capacity is part of the same request.
BeforeStep(async function (this: EventWorld, { pickleStep }) {
  if (pickleStep.type === 'Outcome' && this.pendingEvent) {
    const form = this.pendingEvent;
    this.pendingEvent = undefined;
    await submitEvent(this, form);
  }
});

// ---------- Background ----------

Given('the current date is {string}', function (this: EventWorld, date: string) {
  this.today = date;
});

Given('the club {string} exists', async function (name: string) {
  // A club needs an owner; the next Background step sets the real one.
  const placeholder = await upsertAccount({ email: 'placeholder.owner@mcgill.ca' });
  await prisma.club.create({ data: { name, category: 'Academic', ownerId: placeholder.id } });
});

Given('{string} is the owner of {string}', async function (email: string, clubName: string) {
  const owner = await upsertAccount({ email, role: 'CLUB_OWNER' });
  const club = await findClub(clubName);
  await prisma.club.update({ where: { id: club.id }, data: { ownerId: owner.id } });
});

Given('{string} is not the owner of {string}', async function (email: string, clubName: string) {
  const account = await upsertAccount({ email });
  const club = await findClub(clubName);
  assert.notEqual(club.ownerId, account.id, `${email} unexpectedly owns "${clubName}"`);
});

// ---------- When ----------

When(
  'the user creates an event for {string} with title {string}, category {string}, date {string}, start time {string}, end time {string} and location {string}',
  function (
    this: EventWorld,
    clubName: string,
    title: string,
    category: string,
    date: string,
    startTime: string,
    endTime: string,
    location: string,
  ) {
    this.pendingEvent = { clubName, title, category, date, startTime, endTime, location, capacity: null };
  },
);

When('the user sets the capacity of the event to {int}', function (this: EventWorld, capacity: number) {
  assert.ok(this.pendingEvent, 'No event is being created');
  this.pendingEvent.capacity = capacity;
});

// ---------- Then ----------

Then(
  'the event {string} is created for {string} with status {string}',
  async function (this: EventWorld, title: string, clubName: string, status: string) {
    const club = await findClub(clubName);
    const event = await prisma.event.findFirst({ where: { title, clubId: club.id } });
    assert.ok(event, `Event "${title}" was not created for "${clubName}" (message: ${this.message})`);
    assert.equal(event.status, status.toUpperCase());
  },
);

Then('the event {string} has a capacity of {int}', async function (title: string, capacity: number) {
  const event = await prisma.event.findFirst({ where: { title } });
  assert.ok(event, `Event "${title}" does not exist`);
  assert.equal(event.capacity, capacity);
});

Then('no event is created', async function () {
  assert.equal(await prisma.event.count(), 0);
});
