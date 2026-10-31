// Step definitions for ID_001 Create Account (T018).
// "an account exists for email ..." and "the message ... is issued" are
// shared steps (shared.steps.ts).

import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import { prisma } from '../../backend/src/prisma.ts';
import {
  createAccount,
  type CreateAccountInput,
  type CreateAccountResult,
} from '../../backend/src/services/createAccount.ts';
import { normalizeEmail } from '../../backend/src/services/registrationValidation.ts';
import type { ClubHouseWorld } from '../support/world.ts';
import { parseRole } from './shared.steps.ts';

interface CreateAccountWorld extends ClubHouseWorld {
  /** The registration form filled in by the When steps. */
  registration?: CreateAccountInput;
  registrationResult?: CreateAccountResult;
  accountCountBefore?: number;
}

/**
 * Submits the registration form once all of its fields are known. The
 * alternate flow adds the faculty and study year after the When step, so
 * the form is submitted by the first Then step instead (only once).
 */
async function submitRegistration(world: CreateAccountWorld): Promise<CreateAccountResult> {
  assert.ok(world.registration, 'No student registered in this scenario');

  if (!world.registrationResult) {
    world.accountCountBefore = await prisma.account.count();
    world.registrationResult = await createAccount(world.registration, prisma);
    world.message = world.registrationResult.message;
  }

  return world.registrationResult;
}

// The Before hook (support/hooks.ts) clears the database before each scenario.
Given('the ClubHouse system has no registered accounts', async function () {
  assert.equal(await prisma.account.count(), 0);
});

When(
  'a student registers with name {string}, email {string} and password {string}',
  function (this: CreateAccountWorld, name: string, email: string, password: string) {
    this.registration = { name, email, password };
  },
);

When(
  'the student provides the faculty {string} and the study year {string}',
  function (this: CreateAccountWorld, faculty: string, studyYear: string) {
    assert.ok(this.registration, 'No student registered in this scenario');
    this.registration.faculty = faculty;
    this.registration.studyYear = studyYear;
  },
);

Then(
  'an account is created for email {string} with role {string}',
  async function (this: CreateAccountWorld, email: string, role: string) {
    const result = await submitRegistration(this);
    assert.equal(result.success, true, `Registration failed: ${result.message}`);
    assert.equal(await prisma.account.count(), this.accountCountBefore! + 1);

    const account = await prisma.account.findUnique({ where: { email: normalizeEmail(email) } });
    assert.ok(account, `No account for ${email}`);
    assert.equal(account.name, this.registration!.name);
    assert.equal(account.role, parseRole(role));
  },
);

Then(
  'the profile of {string} has the faculty {string} and the study year {string}',
  async function (this: CreateAccountWorld, email: string, faculty: string, studyYear: string) {
    await submitRegistration(this);

    const account = await prisma.account.findUnique({ where: { email: normalizeEmail(email) } });
    assert.ok(account, `No account for ${email}`);
    assert.equal(account.faculty, faculty);
    assert.equal(account.studyYear, studyYear);
  },
);

Then('no new account is created', async function (this: CreateAccountWorld) {
  const result = await submitRegistration(this);
  assert.equal(result.success, false);
  assert.equal(await prisma.account.count(), this.accountCountBefore);
});

Then('no account is created', async function (this: CreateAccountWorld) {
  const result = await submitRegistration(this);
  assert.equal(result.success, false);
  assert.equal(await prisma.account.count(), 0);
});
