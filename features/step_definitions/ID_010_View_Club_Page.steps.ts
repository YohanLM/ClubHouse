
import assert from 'node:assert/strict';
import { When, Then, type DataTable } from '@cucumber/cucumber';
import { prisma } from '../../backend/src/prisma.ts';
import {
  viewClubPage,
  type ViewClubPageResult,
} from '../../backend/src/services/viewClubPage.ts';
import type { ClubHouseWorld } from '../support/world.ts';

type ViewClubWorld = ClubHouseWorld & {
  today?: string;
  clubPageResult?: ViewClubPageResult;
};

When(
  'the user requests the page of the club {string}',
  async function (this: ViewClubWorld, clubName: string) {
    const result = await viewClubPage(
      {
        actorId: this.currentUser?.id ?? null,
        clubName,
        today: this.today ?? '2026-11-15',
      },
      prisma
    );

    this.clubPageResult = result;
    this.message = result.message;
  }
);

Then(
  'the club page shows the category {string}, the description {string} and the owner {string}',
  function (
    this: ViewClubWorld,
    category: string,
    description: string,
    owner: string
  ) {
    const result = this.clubPageResult;

    assert.ok(result?.success, 'Club page should be shown');
    assert.equal(result.club.category, category);
    assert.equal(result.club.description, description);
    assert.equal(result.club.owner, owner);
  }
);

Then(
  'the club page lists the following upcoming events:',
  function (this: ViewClubWorld, table: DataTable) {
    const result = this.clubPageResult;

    assert.ok(result?.success, 'Club page should be shown');

    const actual = result.club.upcomingEvents.map(event => ({
      Title: event.title,
      Date: event.date,
    }));

    assert.deepEqual(actual, table.hashes());
  }
);

Then(
  'the club page lists no upcoming events',
  function (this: ViewClubWorld) {
    const result = this.clubPageResult;

    assert.ok(result?.success, 'Club page should be shown');
    assert.deepEqual(result.club.upcomingEvents, []);
  }
);

Then(
  'no club page is shown',
  function (this: ViewClubWorld) {
    assert.equal(this.clubPageResult?.success, false);
  }
);
