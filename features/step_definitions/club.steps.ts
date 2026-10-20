import assert from 'node:assert/strict';
import { Given, When, Then, type DataTable } from '@cucumber/cucumber';
import { prisma } from '../../backend/src/prisma.ts';
import { createClub } from '../../backend/src/services/createClub.ts';
import { listClubs } from '../../backend/src/services/listClubs.ts';
import type { ClubHouseWorld } from '../support/world.ts';
import { parseRole, upsertAccount } from './shared.steps.ts';

Given('the club {string} exists with owner {string}', async function (name: string, email: string) {
  const owner = await upsertAccount({ email, role: 'CLUB_OWNER' });
  await prisma.club.create({ data: { name, category: 'Academic', ownerId: owner.id } });
});

When('the user creates a club with name {string}, category {string} and owner {string}',
  async function (this: ClubHouseWorld, name: string, category: string, ownerEmail: string) {
    this.clubCountBefore = await prisma.club.count();
    const result = await createClub({ name, category, ownerEmail }, this.currentUser?.id ?? null, prisma);
    this.message = result.message;
  },
);

Then('the club {string} is created with status {string}', async function (this: ClubHouseWorld, name: string, status: string) {
  const club = await prisma.club.findUniqueOrThrow({ where: { name } });
  assert.equal(club.status, status.toUpperCase());
  assert.equal(await prisma.club.count(), this.clubCountBefore + 1);
});

Then('the owner of the club {string} is {string}', async function (name: string, email: string) {
  const club = await prisma.club.findUniqueOrThrow({ where: { name }, include: { owner: true } });
  assert.equal(club.owner.email, email);
});

Then('the account {string} has role {string}', async function (email: string, role: string) {
  const account = await prisma.account.findUniqueOrThrow({ where: { email } });
  assert.equal(account.role, parseRole(role));
});

Then('{string} is the owner of the clubs {string} and {string}', async function (email: string, first: string, second: string) {
  const clubs = await prisma.club.findMany({ where: { owner: { email } }, orderBy: { name: 'asc' } });
  assert.deepEqual(clubs.map((club) => club.name), [first, second].sort());
});

Then('no club is created', async function (this: ClubHouseWorld) {
  assert.equal(await prisma.club.count(), this.clubCountBefore);
});

Given('the following clubs exist:', async function (table: DataTable) {
  const owner = await upsertAccount({ email: 'fixture.owner@mcgill.ca', role: 'CLUB_OWNER' });
  for (const row of table.hashes()) {
    assert.ok(['Active', 'Inactive'].includes(row.Status));
    await prisma.club.create({ data: { name: row.ClubName, category: row.Category,
      status: row.Status === 'Active' ? 'ACTIVE' : 'INACTIVE', ownerId: owner.id } });
  }
});

When('the user requests the list of clubs', async function (this: ClubHouseWorld) {
  const result = await listClubs(this.currentUser?.id ?? null, prisma);
  this.clubs = result.clubs;
  this.message = result.success ? null : result.message;
});

Then('the following clubs are listed in alphabetical order:', function (this: ClubHouseWorld, table: DataTable) {
  assert.deepEqual(this.clubs.map((club) => ({ ClubName: club.name, Category: club.category })), table.hashes());
});

Then('{int} clubs are listed', function (this: ClubHouseWorld, count: number) {
  assert.equal(this.clubs.length, count);
});

Then('the club {string} is not listed', function (this: ClubHouseWorld, name: string) {
  assert.equal(this.clubs.some((club) => club.name === name), false);
});

Then('no clubs are listed', function (this: ClubHouseWorld) {
  assert.deepEqual(this.clubs, []);
});
