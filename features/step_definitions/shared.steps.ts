// Shared step definitions used by several features (T007).
// Feature-specific When steps store the result of their action in
// `this.message` so that "the message ... is issued" can check it.

import assert from 'node:assert/strict';
import { BeforeStep, Given, Then, type DataTable } from '@cucumber/cucumber';
import type { EventStatus, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../../backend/src/prisma.ts';
import { normalizeEmail } from '../../backend/src/services/registrationValidation.ts';
import type { ClubHouseWorld } from '../support/world.ts';

const ROLES: Record<string, Role> = {
  User: 'USER',
  'Club Owner': 'CLUB_OWNER',
  Administrator: 'ADMINISTRATOR',
};

// Used when a scenario does not care about the password.
const DEFAULT_PASSWORD = 'Passw0rd!23';

// Low cost keeps the tests fast; bcrypt.compare works with any cost.
const TEST_BCRYPT_ROUNDS = 4;

export function parseRole(role: string): Role {
  const parsed = ROLES[role];
  if (!parsed) throw new Error(`Unknown role "${role}"`);
  return parsed;
}

/** "alice.tremblay@mail.mcgill.ca" -> "Alice Tremblay" */
function nameFromEmail(email: string): string {
  return email
    .split('@')[0]
    .split(/[._-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

interface AccountDetails {
  email: string;
  name?: string;
  password?: string;
  role?: Role;
}

const hashPassword = (password: string) => bcrypt.hash(password, TEST_BCRYPT_ROUNDS);

/**
 * Creates the account, or, if the email is already registered, updates only
 * the fields that were given.
 */
export async function upsertAccount(details: AccountDetails) {
  const email = normalizeEmail(details.email);
  return prisma.account.upsert({
    where: { email },
    create: {
      email,
      name: details.name || nameFromEmail(email),
      passwordHash: await hashPassword(details.password || DEFAULT_PASSWORD),
      role: details.role ?? 'USER',
    },
    update: {
      ...(details.name && { name: details.name }),
      ...(details.password && { passwordHash: await hashPassword(details.password) }),
      ...(details.role && { role: details.role }),
    },
  });
}

// Columns: Email (required), Name, Password, Role (all optional).
Given('the following accounts exist:', async function (table: DataTable) {
  for (const row of table.hashes()) {
    await upsertAccount({
      email: row.Email,
      name: row.Name,
      password: row.Password,
      role: row.Role ? parseRole(row.Role) : undefined,
    });
  }
});

Given('an account exists for email {string}', async function (email: string) {
  await upsertAccount({ email });
});

// Creates the account if the scenario has not set it up yet (e.g. ID_008).
Given(
  '{string} is logged in with role {string}',
  async function (this: ClubHouseWorld, email: string, role: string) {
    const account = await upsertAccount({ email, role: parseRole(role) });
    this.currentUser = { id: account.id, email: account.email, role: account.role };
  },
);

Then('the message {string} is issued', function (this: ClubHouseWorld, expected: string) {
  assert.equal(this.message, expected);
});

// ---------- Events ----------

BeforeStep(function (this: ClubHouseWorld, { pickleStep }) {
  this.currentStepType = pickleStep.type;
});

const EVENT_STATUSES: Record<string, EventStatus> = {
  Scheduled: 'SCHEDULED',
  Cancelled: 'CANCELLED',
  Completed: 'COMPLETED',
};

export function parseEventStatus(status: string): EventStatus {
  const parsed = EVENT_STATUSES[status];
  if (!parsed) throw new Error(`Unknown event status "${status}"`);
  return parsed;
}

export async function findClubByName(name: string) {
  const club = await prisma.club.findUnique({ where: { name } });
  assert.ok(club, `Club "${name}" does not exist`);
  return club;
}

/**
 * Returns the club, creating it if the scenario has not set it up yet
 * (e.g. ID_019, ID_020). Its owner is a placeholder; scenarios that care
 * set the real one with "... is the owner of ...".
 */
export async function findOrCreateClub(name: string) {
  const existing = await prisma.club.findUnique({ where: { name } });
  if (existing) return existing;
  const owner = await upsertAccount({ email: 'placeholder.owner@mcgill.ca', role: 'CLUB_OWNER' });
  return prisma.club.create({ data: { name, category: 'Academic', ownerId: owner.id } });
}

export async function findEventByTitle(title: string) {
  const event = await prisma.event.findFirst({ where: { title } });
  assert.ok(event, `Event "${title}" does not exist`);
  return event;
}

/**
 * Creates one event from a table row. Only Title is required; the other
 * columns (Category, Date, Start, End, Location, Capacity, Status, Reason)
 * fall back to defaults the scenarios do not care about.
 */
async function createEventFromRow(clubId: number, row: Record<string, string>) {
  assert.ok(row.Title, 'Every event row needs a Title');
  await prisma.event.create({
    data: {
      clubId,
      title: row.Title,
      category: row.Category || 'Academic',
      date: row.Date || '2026-12-01',
      startTime: row.Start || '18:00',
      endTime: row.End || '20:00',
      location: row.Location || 'McConnell 103',
      capacity: row.Capacity ? Number(row.Capacity) : null,
      status: row.Status ? parseEventStatus(row.Status) : 'SCHEDULED',
      cancellationReason: row.Reason || null,
    },
  });
}

// Columns: ClubName, Title (required), plus the optional columns above.
// Clubs that do not exist yet are created.
Given('the following events exist:', async function (table: DataTable) {
  for (const row of table.hashes()) {
    assert.ok(row.ClubName, 'Every event row needs a ClubName');
    const club = await findOrCreateClub(row.ClubName);
    await createEventFromRow(club.id, row);
  }
});

// Same columns as "the following events exist:", without ClubName.
Given(
  'the club {string} has the following events:',
  async function (clubName: string, table: DataTable) {
    const club = await findOrCreateClub(clubName);
    for (const row of table.hashes()) {
      await createEventFromRow(club.id, row);
    }
  },
);

Then('the event {string} has status {string}', async function (title: string, status: string) {
  const event = await findEventByTitle(title);
  assert.equal(event.status, parseEventStatus(status));
});

// Given: sets the capacity (ID_020). Then: checks it (ID_015).
Given(
  'the event {string} has a capacity of {int}',
  async function (this: ClubHouseWorld, title: string, capacity: number) {
    const event = await findEventByTitle(title);
    if (this.currentStepType === 'Context') {
      await prisma.event.update({ where: { id: event.id }, data: { capacity } });
    } else {
      assert.equal(event.capacity, capacity);
    }
  },
);
