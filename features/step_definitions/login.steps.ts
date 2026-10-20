import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import { prisma } from '../../backend/src/prisma.ts';
import { login } from '../../backend/src/services/login.ts';
import { normalizeEmail } from '../../backend/src/services/registrationValidation.ts';
import type { ClubHouseWorld } from '../support/world.ts';
import { parseRole } from './shared.steps.ts';

When('a user logs in with email {string} and password {string}',
  async function (this: ClubHouseWorld, email: string, password: string) {
    const result = await login({ email, password }, prisma);
    this.currentUser = result.success ? result.user : null;
    this.message = result.message;
  },
);

Then('the user is logged in as {string} with role {string}',
  function (this: ClubHouseWorld, email: string, role: string) {
    assert.equal(this.currentUser?.email, normalizeEmail(email));
    assert.equal(this.currentUser?.role, parseRole(role));
    assert.ok(!('passwordHash' in this.currentUser!));
  },
);

// Cucumber's Given/Then keywords share a registry; define this phrase once.
Given('no user is logged in', function (this: ClubHouseWorld) {
  assert.equal(this.currentUser, null);
});

Given('{int} consecutive failed login attempts were made for email {string}',
  async function (attempts: number, email: string) {
    for (let i = 0; i < attempts; i++) {
      const result = await login({ email, password: 'DefinitelyWrong!99' }, prisma);
      assert.equal(result.success, false);
    }
    const account = await prisma.account.findUniqueOrThrow({ where: { email: normalizeEmail(email) } });
    assert.equal(account.failedLoginAttempts, attempts);
    assert.ok(account.lockedUntil);
  },
);
