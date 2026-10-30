// Step definitions for ID_008 Browse Clubs (T028).
// Uses the shared steps (T007) for "... is logged in with role ..." and
// "the message ... is issued", "no user is logged in" from ID_002, and
// listClubs from backend/src/services/listClubs.ts (T027).

import assert from 'node:assert/strict';
import { Given, When, Then, type DataTable } from '@cucumber/cucumber';
import type { ClubStatus } from '@prisma/client';
import { prisma } from '../../backend/src/prisma.ts';
import { listClubs, type ListedClub } from '../../backend/src/services/listClubs.ts';
import type { ClubHouseWorld } from '../support/world.ts';
import { upsertAccount } from './shared.steps.ts';

type BrowseClubsWorld = ClubHouseWorld & {
  /** Clubs returned by the last listClubs call (empty when it failed). */
  listedClubs?: ListedClub[];
};

// ---------- Background ----------

Given('the following clubs exist:', async function (table: DataTable) {
  // Every club needs an owner; the scenarios do not care which one.
  const owner = await upsertAccount({ email: 'club.owner@mcgill.ca', role: 'CLUB_OWNER' });

  for (const row of table.hashes()) {
    await prisma.club.create({
      data: {
        name: row.ClubName,
        category: row.Category,
        status: row.Status.toUpperCase() as ClubStatus,
        ownerId: owner.id,
      },
    });
  }
});

// ---------- When ----------

When('the user requests the list of clubs', async function (this: BrowseClubsWorld) {
  const result = await listClubs({ actorId: this.currentUser?.id ?? null }, prisma);

  if (result.success) {
    this.listedClubs = result.clubs;
    this.message = null;
  } else {
    this.listedClubs = [];
    this.message = result.message;
  }
});

// ---------- Then ----------

Then(
  'the following clubs are listed in alphabetical order:',
  function (this: BrowseClubsWorld, table: DataTable) {
    const expected = table.hashes().map((row) => ({ name: row.ClubName, category: row.Category }));
    const actual = (this.listedClubs ?? []).map(({ name, category }) => ({ name, category }));
    assert.deepEqual(actual, expected);
  },
);

Then('{int} clubs are listed', function (this: BrowseClubsWorld, count: number) {
  assert.equal(this.listedClubs?.length, count);
});

Then('the club {string} is not listed', function (this: BrowseClubsWorld, clubName: string) {
  assert.ok(
    !(this.listedClubs ?? []).some((club) => club.name === clubName),
    `${clubName} should not be listed`,
  );
});

Then('no clubs are listed', function (this: BrowseClubsWorld) {
  assert.deepEqual(this.listedClubs, []);
});
