import assert from 'node:assert/strict';
import { Given, Then, When } from '@cucumber/cucumber';
import { prisma } from '../../backend/src/prisma.ts';
import { rsvpToEvent, type RsvpResponse } from '../../backend/src/services/rsvpToEvent.ts';
import type { ClubHouseWorld } from '../support/world.ts';
import { findEventByTitle, upsertAccount } from './shared.steps.ts';

type RsvpWorld = ClubHouseWorld & { today?: string };

function expectedResponse(label: string): RsvpResponse {
  if (label === 'Attending') return 'ATTENDING';
  if (label === 'Not Attending') return 'NOT_ATTENDING';
  throw new Error(`Unknown RSVP fixture response "${label}"`);
}

async function findRsvp(email: string, title: string) {
  const account = await prisma.account.findUniqueOrThrow({ where: { email } });
  const event = await findEventByTitle(title);
  return prisma.rSVP.findUnique({
    where: { accountId_eventId: { accountId: account.id, eventId: event.id } },
  });
}

async function assertNoRsvp(email: string, title: string) {
  assert.equal(await findRsvp(email, title), null, `Unexpected RSVP for ${email} on ${title}`);
}

Given('no RSVP exists for {string} on the event {string}', assertNoRsvp);
Then('no RSVP is saved for {string} on the event {string}', assertNoRsvp);

Given('{string} has RSVPed {string} to the event {string}', async function (
  email: string, response: string, title: string,
) {
  const account = await upsertAccount({ email });
  const event = await findEventByTitle(title);
  await prisma.rSVP.create({
    data: { accountId: account.id, eventId: event.id, response: expectedResponse(response) },
  });
});

When('the user RSVPs {string} to the event {string}', async function (
  this: RsvpWorld, response: string, title: string,
) {
  assert.ok(this.currentUser, 'The scenario requires a logged-in user');
  assert.ok(this.today, 'The scenario must set the current date');
  const event = await findEventByTitle(title);
  const result = await rsvpToEvent(
    { actorId: this.currentUser.id, eventId: event.id, response },
    prisma,
    () => new Date(`${this.today}T17:00:00Z`),
  );
  this.message = result.message;
});

Then('the RSVP of {string} for the event {string} is {string}', async function (
  email: string, title: string, response: string,
) {
  const rsvp = await findRsvp(email, title);
  assert.ok(rsvp, `Missing RSVP for ${email} on ${title}`);
  assert.equal(rsvp.response, expectedResponse(response));
});

Then('the number of attendees of the event {string} is {int}', async function (
  title: string, expected: number,
) {
  const event = await findEventByTitle(title);
  const count = await prisma.rSVP.count({ where: { eventId: event.id, response: 'ATTENDING' } });
  assert.equal(count, expected);
});
