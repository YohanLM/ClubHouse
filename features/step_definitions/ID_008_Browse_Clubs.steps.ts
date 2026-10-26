
import {
  Given,
  When,
  Then,
  DataTable,
} from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { prisma } from '../../backend/src/prisma.ts';
type Role = 'USER' | 'CLUB_OWNER' | 'ADMINISTRATOR';

// Test state
let loggedInUserId: number | null = null;
let listedClubs: { name: string; category: string }[] = [];
let issuedMessage = '';

// Background: create clubs for each scenario
Given(
  'the following clubs exist:',
  async function (table: DataTable) {
    const rows = table.hashes();

    const owner = await prisma.account.create({
      data: {
        name: 'Test Club Owner',
        email: 'owner.test@mcgill.ca',
        passwordHash: 'test-hash',
        role: 'CLUB_OWNER',
      },
    });

    for (const row of rows) {
      await prisma.club.create({
        data: {
          name: row.ClubName,
          category: row.Category,
          status: row.Status.toUpperCase() as
            'ACTIVE' | 'INACTIVE',
          ownerId: owner.id,
        },
      });
    }

    loggedInUserId = null;
    listedClubs = [];
    issuedMessage = '';
  }
);

// Scenario 1 and Scenario Outline:
// user logged in with a specified role
Given(
  '{string} is logged in with role {string}',
  async function (email: string, role: string) {
    const roleMap: Record<string, Role> = {
      User: 'USER',
      'Club Owner': 'CLUB_OWNER',
      Administrator: 'ADMINISTRATOR',
    };

    assert.ok(roleMap[role], `Unknown role: ${role}`);

    const account = await prisma.account.create({
      data: {
        name: 'Test User',
        email,
        passwordHash: 'test-hash',
        role: roleMap[role],
      },
    });

    loggedInUserId = account.id;
  }
);

// Scenario 3: no logged-in user
Given('no user is logged in', function () {
  loggedInUserId = null;
});

// Request the list of clubs
When('the user requests the list of clubs', async function () {
  listedClubs = [];
  issuedMessage = '';

  if (loggedInUserId === null) {
    issuedMessage = 'Login required';
    return;
  }

  const clubs = await prisma.club.findMany({
    where: {
      status: 'ACTIVE',
    },
    orderBy: {
      name: 'asc',
    },
    select: {
      name: true,
      category: true,
    },
  });

  listedClubs = clubs;
});

// Check club names and alphabetical order
Then(
  'the following clubs are listed in alphabetical order:',
  function (table: DataTable) {
    const expected = table.hashes().map((row) => ({
      name: row.ClubName,
      category: row.Category,
    }));

    assert.deepEqual(listedClubs, expected);
  }
);

// Check number of clubs
Then('{int} clubs are listed', function (count: number) {
  assert.equal(listedClubs.length, count);
});

// Check an inactive club is excluded
Then(
  'the club {string} is not listed',
  function (clubName: string) {
    assert.ok(
      !listedClubs.some((club) => club.name === clubName),
      `${clubName} should not be listed`
    );
  }
);

// Check empty list
Then('no clubs are listed', function () {
  assert.equal(listedClubs.length, 0);
});

// Check error message
Then(
  'the message {string} is issued',
  function (message: string) {
    assert.equal(issuedMessage, message);
  }
);
