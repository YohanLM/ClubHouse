import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { Given, When, Then } from '@cucumber/cucumber';
import { prisma } from '../../backend/src/prisma.ts';
import { createAccount } from '../../backend/src/services/createAccount.ts';
import { normalizeEmail } from '../../backend/src/services/registrationValidation.ts';
import type { ClubHouseWorld } from '../support/world.ts';
import { parseRole } from './shared.steps.ts';

Given('the ClubHouse system has no registered accounts', async function () {
  assert.equal(await prisma.account.count(), 0);
});

When('a student registers with name {string}, email {string} and password {string}',
  async function (this: ClubHouseWorld, name: string, email: string, password: string) {
    this.registration = { name, email, password };
    this.accountCountBefore = await prisma.account.count();
    this.pendingSubmission = async () => {
      this.registrationResult = await createAccount(this.registration!, prisma);
      this.message = this.registrationResult.message;
    };
  },
);

When('the student provides the faculty {string} and the study year {string}',
  function (this: ClubHouseWorld, faculty: string, studyYear: string) {
    assert.ok(this.registration);
    Object.assign(this.registration, { faculty, studyYear });
  },
);

Then('an account is created for email {string} with role {string}',
  async function (this: ClubHouseWorld, email: string, role: string) {
    await this.submit();
    assert.equal(this.registrationResult?.success, true);
    assert.equal(await prisma.account.count(), this.accountCountBefore + 1);
    const account = await prisma.account.findUniqueOrThrow({ where: { email: normalizeEmail(email) } });
    assert.equal(account.role, parseRole(role));
    assert.equal(account.name, this.registration!.name!.trim());
    assert.notEqual(account.passwordHash, this.registration!.password);
    assert.equal(await bcrypt.compare(this.registration!.password!, account.passwordHash), true);
    assert.ok(!('passwordHash' in (this.registrationResult!.success ? this.registrationResult!.account : {})));
  },
);

Then('the profile of {string} has the faculty {string} and the study year {string}',
  async function (email: string, faculty: string, studyYear: string) {
    const account = await prisma.account.findUniqueOrThrow({ where: { email: normalizeEmail(email) } });
    assert.equal(account.faculty, faculty);
    assert.equal(account.studyYear, studyYear);
  },
);

Then('no new account is created', async function (this: ClubHouseWorld) {
  await this.submit();
  assert.equal(this.registrationResult?.success, false);
  assert.equal(await prisma.account.count(), this.accountCountBefore);
});

Then('no account is created', async function (this: ClubHouseWorld) {
  await this.submit();
  assert.equal(this.registrationResult?.success, false);
  assert.equal(await prisma.account.count(), 0);
});
