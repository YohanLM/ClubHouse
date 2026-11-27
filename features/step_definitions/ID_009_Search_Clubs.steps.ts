
import assert from 'node:assert/strict';
import { When, Then } from '@cucumber/cucumber';
import { prisma } from '../../backend/src/prisma.ts';
import {
  searchClubs,
} from '../../backend/src/services/searchClubs.ts';
import type {
  ListedClub,
} from '../../backend/src/services/listClubs.ts';
import type {
  ClubHouseWorld,
} from '../support/world.ts';

type SearchClubsWorld = ClubHouseWorld & {
  listedClubs?: ListedClub[];
};

async function runSearch(
  world: SearchClubsWorld,
  options: { keyword?: string; category?: string }
) {
  const result = await searchClubs(
    {
      actorId: world.currentUser?.id ?? null,
      ...options,
    },
    prisma
  );

  if (result.success) {
    world.listedClubs = result.clubs;
    world.message = result.message ?? null;
  } else {
    world.listedClubs = [];
    world.message = result.message;
  }
}

When(
  'the user searches clubs with the keyword {string}',
  async function (this: SearchClubsWorld, keyword: string) {
    await runSearch(this, { keyword });
  }
);

When(
  'the user searches clubs in the category {string}',
  async function (this: SearchClubsWorld, category: string) {
    await runSearch(this, { category });
  }
);

Then(
  'the club {string} is listed first',
  function (this: SearchClubsWorld, clubName: string) {
    assert.equal(this.listedClubs?.[0]?.name, clubName);
  }
);
