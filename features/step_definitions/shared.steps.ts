// Shared step definitions used by several features (T007).
// Feature-specific When steps store the result of their action in
// `this.message` so that "the message ... is issued" can check it.

import assert from 'node:assert/strict';
import { Given, Then, type DataTable } from '@cucumber/cucumber';
import type { Role } from '@prisma/client';
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
