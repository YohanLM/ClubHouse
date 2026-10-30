// Step definitions for ID_007 Create Club (T026).
// Uses the shared steps (T007) for "the following accounts exist:",
// "... is logged in with role ..." and "the message ... is issued", and
// createClub from backend/src/services/createClub.ts (T024).

import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import { prisma } from '../../backend/src/prisma.ts';
import { createClub } from '../../backend/src/services/createClub.ts';
import { normalizeEmail } from '../../backend/src/services/registrationValidation.ts';
import type { ClubHouseWorld } from '../support/world.ts';
import { parseRole } from './shared.steps.ts';

type CreateClubWorld = ClubHouseWorld & {
  /** Number of clubs before the When step, to check that none was created. */
  clubCountBefore?: number;
};

async function findAccount(email: string) {
  const account = await prisma.account.findUnique({ where: { email: normalizeEmail(email) } });
  assert.ok(account, `No account for ${email}`);
  return account;
}

async function findClub(name: string) {
  const club = await prisma.club.findUnique({ where: { name }, include: { owner: true } });
  assert.ok(club, `Club "${name}" does not exist`);
  return club;
}

// ---------- Background ----------

Given(
  'the club {string} exists with owner {string}',
  async function (name: string, ownerEmail: string) {
    const owner = await findAccount(ownerEmail);
    await prisma.club.create({ data: { name, category: 'Academic', ownerId: owner.id } });
  },
);

// ---------- When ----------

When(
  'the user creates a club with name {string}, category {string} and owner {string}',
  async function (this: CreateClubWorld, name: string, category: string, ownerEmail: string) {
    this.clubCountBefore = await prisma.club.count();
    const result = await createClub(
      { actorId: this.currentUser?.id ?? null, name, category, ownerEmail },
      prisma,
    );
    this.message = result.message;
  },
);

// ---------- Then ----------

Then(
  'the club {string} is created with status {string}',
  async function (this: CreateClubWorld, name: string, status: string) {
    assert.equal(await prisma.club.count(), this.clubCountBefore! + 1);
    const club = await findClub(name);
    assert.equal(club.status, status.toUpperCase());
  },
);

Then('the owner of the club {string} is {string}', async function (name: string, ownerEmail: string) {
  const club = await findClub(name);
  assert.equal(club.owner.email, normalizeEmail(ownerEmail));
});

Then('the account {string} has role {string}', async function (email: string, role: string) {
  const account = await findAccount(email);
  assert.equal(account.role, parseRole(role));
});

Then(
  '{string} is the owner of the clubs {string} and {string}',
  async function (ownerEmail: string, firstClub: string, secondClub: string) {
    for (const name of [firstClub, secondClub]) {
      const club = await findClub(name);
      assert.equal(club.owner.email, normalizeEmail(ownerEmail), `${ownerEmail} does not own "${name}"`);
    }
  },
);

Then('no club is created', async function (this: CreateClubWorld) {
  assert.equal(await prisma.club.count(), this.clubCountBefore);
});
