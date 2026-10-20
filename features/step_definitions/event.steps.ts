import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import { prisma } from '../../backend/src/prisma.ts';
import { createEvent } from '../../backend/src/services/createEvent.ts';
import type { ClubHouseWorld } from '../support/world.ts';
import { upsertAccount } from './shared.steps.ts';

Given('the current date is {string}', function (this: ClubHouseWorld, date: string) {
  this.currentDate = new Date(`${date}T12:00:00Z`);
});

Given('the club {string} exists', async function (name: string) {
  const owner = await upsertAccount({ email: 'fixture.owner@mcgill.ca', role: 'CLUB_OWNER' });
  await prisma.club.create({ data: { name, category: 'Academic', ownerId: owner.id } });
});

Given('{string} is the owner of {string}', async function (email: string, name: string) {
  const owner = await upsertAccount({ email, role: 'CLUB_OWNER' });
  await prisma.club.update({ where: { name }, data: { ownerId: owner.id } });
});

Given('{string} is not the owner of {string}', async function (email: string, name: string) {
  const user = await upsertAccount({ email, role: 'USER' });
  const club = await prisma.club.findUniqueOrThrow({ where: { name } });
  assert.notEqual(user.id, club.ownerId);
});

When('the user creates an event for {string} with title {string}, category {string}, date {string}, start time {string}, end time {string} and location {string}',
  async function (this: ClubHouseWorld, clubName: string, title: string, category: string, date: string,
    startTime: string, endTime: string, location: string) {
    this.eventInput = { clubName, title, category, date, startTime, endTime, location };
    this.eventCountBefore = await prisma.event.count();
    this.pendingSubmission = async () => {
      this.eventResult = await createEvent(this.eventInput!, this.currentUser?.id ?? null, prisma,
        () => this.currentDate ?? new Date());
      this.message = this.eventResult.message;
    };
  },
);

When('the user sets the capacity of the event to {int}', function (this: ClubHouseWorld, capacity: number) {
  assert.ok(this.eventInput);
  this.eventInput.capacity = capacity;
});

Then('the event {string} is created for {string} with status {string}',
  async function (this: ClubHouseWorld, title: string, clubName: string, status: string) {
    await this.submit();
    assert.equal(this.eventResult?.success, true);
    const event = await prisma.event.findFirstOrThrow({ where: { title, club: { name: clubName } } });
    assert.equal(event.status, status.toUpperCase());
    assert.equal(await prisma.event.count(), this.eventCountBefore + 1);
    for (const key of ['category', 'date', 'startTime', 'endTime', 'location'] as const) {
      assert.equal(event[key], this.eventInput![key]);
    }
  },
);

Then('the event {string} has a capacity of {int}', async function (this: ClubHouseWorld, title: string, capacity: number) {
  const event = await prisma.event.findFirstOrThrow({ where: { title, club: { name: this.eventInput!.clubName } } });
  assert.equal(event.capacity, capacity);
});

Then('no event is created', async function (this: ClubHouseWorld) {
  await this.submit();
  assert.equal(this.eventResult?.success, false);
  assert.equal(await prisma.event.count(), this.eventCountBefore);
});
