import assert from 'node:assert/strict';
import { Given, Then, When } from '@cucumber/cucumber';
import { prisma } from '../../backend/src/prisma.ts';
import { normalizeEmail } from '../../backend/src/services/registrationValidation.ts';
import type { ClubHouseWorld } from '../support/world.ts';
import { upsertAccount } from './shared.steps.ts';

type FollowClubWorld = ClubHouseWorld & {
  followedClubName?: string;
};

async function findAccount(email: string) {
  const account = await prisma.account.findUnique({ where: { email: normalizeEmail(email) } });
  assert.ok(account, `No account for ${email}`);
  return account;
}

async function findClub(name: string) {
  const club = await prisma.club.findUnique({ where: { name } });
  assert.ok(club, `Club "${name}" does not exist`);
  return club;
}

async function setFollow(accountEmail: string, clubName: string) {
  const account = await findAccount(accountEmail);
  const club = await findClub(clubName);

  await prisma.follow.upsert({
    where: {
      accountId_clubId: {
        accountId: account.id,
        clubId: club.id,
      },
    },
    create: {
      accountId: account.id,
      clubId: club.id,
    },
    update: {},
  });
}

async function clearFollow(accountEmail: string, clubName: string) {
  const account = await findAccount(accountEmail);
  const club = await findClub(clubName);

  await prisma.follow.deleteMany({
    where: {
      accountId: account.id,
      clubId: club.id,
    },
  });
}

async function assertFollowExists(accountEmail: string, clubName: string, expected: boolean) {
  const account = await prisma.account.findUnique({ where: { email: normalizeEmail(accountEmail) } });
  if (!account) {
    assert.equal(expected, false, `No account for ${accountEmail}`);
    return;
  }

  const club = await findClub(clubName);
  const follow = await prisma.follow.findUnique({
    where: {
      accountId_clubId: {
        accountId: account.id,
        clubId: club.id,
      },
    },
  });

  assert.equal(Boolean(follow), expected);
}

async function followClubForCurrentUser(this: FollowClubWorld, clubName: string) {
  this.followedClubName = clubName;

  if (!this.currentUser) {
    this.message = 'Login required';
    return;
  }

  const club = await prisma.club.findUnique({ where: { name: clubName } });
  if (!club) {
    this.message = 'Club not found';
    return;
  }

  const follow = await prisma.follow.findUnique({
    where: {
      accountId_clubId: {
        accountId: this.currentUser.id,
        clubId: club.id,
      },
    },
  });

  if (follow) {
    this.message = 'Club already followed';
    return;
  }

  await prisma.follow.create({
    data: {
      accountId: this.currentUser.id,
      clubId: club.id,
    },
  });

  this.message = 'Club followed';
}

// ---------- Background / setup ----------

Given('the club {string} has owner {string}', async function (clubName: string, ownerEmail: string) {
  const owner = await upsertAccount({ email: ownerEmail, role: 'CLUB_OWNER' });
  await prisma.club.upsert({
    where: { name: clubName },
    update: { ownerId: owner.id },
    create: {
      name: clubName,
      category: 'Academic',
      ownerId: owner.id,
    },
  });
});

Given('{string} follows the club {string}', async function (email: string, clubName: string) {
  await setFollow(email, clubName);
});

Given('{string} is already following the club {string}', async function (email: string, clubName: string) {
  await setFollow(email, clubName);
});

// ---------- Actions ----------

When('the user follows the club {string}', async function (this: FollowClubWorld, clubName: string) {
  await followClubForCurrentUser.call(this, clubName);
});

When('the user follows the club {string} from the club page', async function (this: FollowClubWorld, clubName: string) {
  await followClubForCurrentUser.call(this, clubName);
});

When('the user unfollows the club {string}', async function (this: FollowClubWorld, clubName: string) {
  this.followedClubName = clubName;

  if (!this.currentUser) {
    this.message = 'Login required';
    return;
  }

  const club = await prisma.club.findUnique({ where: { name: clubName } });
  if (!club) {
    this.message = 'Club not found';
    return;
  }

  await prisma.follow.deleteMany({
    where: {
      accountId: this.currentUser.id,
      clubId: club.id,
    },
  });

  this.message = 'Club unfollowed';
});

// ---------- Outcomes ----------

Then('{string} is following the club {string}', async function (email: string, clubName: string) {
  await assertFollowExists(email, clubName, true);
});

Then('the club {string} is followed by {string}', async function (clubName: string, email: string) {
  await assertFollowExists(email, clubName, true);
});

Then('the club {string} has {int} followers', async function (clubName: string, count: number) {
  const club = await findClub(clubName);
  const followers = await prisma.follow.count({ where: { clubId: club.id } });
  assert.equal(followers, count);
});

Then('the club {string} is not followed by {string}', async function (clubName: string, email: string) {
  await assertFollowExists(email, clubName, false);
});

Then('no follow exists for {string} on the club {string}', async function (email: string, clubName: string) {
  await assertFollowExists(email, clubName, false);
});
