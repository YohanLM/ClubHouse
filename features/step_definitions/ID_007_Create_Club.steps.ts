import assert from 'node:assert/strict';
import {
  Given,
  Then,
  When,
  World,
  setWorldConstructor,
  type DataTable,
} from '@cucumber/cucumber';
import type { Role } from '@prisma/client';
import { prisma } from '../../backend/src/prisma.ts';

const roleByLabel: Record<string, Role> = {
  Administrator: 'ADMINISTRATOR',
  'Club Owner': 'CLUB_OWNER',
  User: 'USER',
};

function roleFromLabel(label: string): Role {
  const role = roleByLabel[label];
  assert.ok(role, `Unsupported account role: ${label}`);
  return role;
}

class CreateClubWorld extends World {
  loggedInRole: Role | null = null;
  createdClubName: string | null = null;
  message: string | null = null;
}

setWorldConstructor(CreateClubWorld);

Given('the following accounts exist:', async function (table: DataTable) {
  for (const row of table.hashes()) {
    await prisma.account.create({
      data: {
        name: row.Email,
        email: row.Email.toLowerCase(),
        passwordHash: 'acceptance-test-hash',
        role: roleFromLabel(row.Role),
      },
    });
  }
});

Given(
  'the club {string} exists with owner {string}',
  async function (name: string, ownerEmail: string) {
    const owner = await prisma.account.findUnique({
      where: { email: ownerEmail.toLowerCase() },
    });
    assert.ok(owner, `Club owner account not found: ${ownerEmail}`);

    await prisma.club.create({
      data: { name, category: 'Test', ownerId: owner.id },
    });
  }
);

Given(
  '{string} is logged in with role {string}',
  async function (email: string, roleLabel: string) {
    const account = await prisma.account.findUnique({
      where: { email: email.toLowerCase() },
    });
    assert.ok(account, `Account not found: ${email}`);

    const role = roleFromLabel(roleLabel);
    assert.equal(account.role, role, `Account ${email} does not have role ${roleLabel}`);
    this.loggedInRole = role;
  }
);

When(
  'the user creates a club with name {string}, category {string} and owner {string}',
  async function (name: string, category: string, ownerEmail: string) {
    this.createdClubName = null;
    this.message = null;

    if (this.loggedInRole !== 'ADMINISTRATOR') {
      this.message = 'Unauthorized user';
      return;
    }

    if (!name.trim()) {
      this.message = 'Club name is required';
      return;
    }
    if (!category.trim()) {
      this.message = 'Category is required';
      return;
    }
    if (await prisma.club.findUnique({ where: { name: name.trim() } })) {
      this.message = 'Club name already exists';
      return;
    }

    const owner = await prisma.account.findUnique({
      where: { email: ownerEmail.toLowerCase() },
    });
    if (!owner) {
      this.message = 'Owner account not found';
      return;
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.club.create({
        data: {
          name: name.trim(),
          category: category.trim(),
          ownerId: owner.id,
          status: 'ACTIVE',
        },
      });
      await transaction.account.update({
        where: { id: owner.id },
        data: { role: 'CLUB_OWNER' },
      });
    });

    this.createdClubName = name.trim();
    this.message = 'Club created';
  }
);

Then(
  'the club {string} is created with status {string}',
  async function (name: string, status: string) {
    const club = await prisma.club.findUnique({ where: { name } });
    assert.ok(club, `Club ${name} was not created`);
    assert.equal(this.createdClubName, name);
    assert.equal(club.status, status.toUpperCase());
  }
);

Then(
  'the owner of the club {string} is {string}',
  async function (clubName: string, ownerEmail: string) {
    const club = await prisma.club.findUnique({
      where: { name: clubName },
      include: { owner: true },
    });
    assert.ok(club, `Club ${clubName} was not found`);
    assert.equal(club.owner.email, ownerEmail.toLowerCase());
  }
);

Then(
  'the account {string} has role {string}',
  async function (email: string, roleLabel: string) {
    const account = await prisma.account.findUnique({
      where: { email: email.toLowerCase() },
    });
    assert.ok(account, `Account not found: ${email}`);
    assert.equal(account.role, roleFromLabel(roleLabel));
  }
);

Then(
  '{string} is the owner of the clubs {string} and {string}',
  async function (ownerEmail: string, firstClub: string, secondClub: string) {
    const clubs = await prisma.club.findMany({
      where: { name: { in: [firstClub, secondClub] } },
      include: { owner: true },
    });
    assert.equal(clubs.length, 2);
    assert.ok(clubs.every((club) => club.owner.email === ownerEmail.toLowerCase()));
  }
);

Then('no club is created', async function () {
  assert.equal(this.createdClubName, null);
});

Then('the message {string} is issued', function (message: string) {
  assert.equal(this.message, message);
});
