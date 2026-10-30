// Step definitions for ID_002 Log In.
// Uses the shared steps (T007) for "the following accounts exist:" and
// "the message ... is issued", and login from backend/src/services/login.ts.

import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import { prisma } from '../../backend/src/prisma.ts';
import { login } from '../../backend/src/services/login.ts';
import type { ClubHouseWorld } from '../support/world.ts';
import { parseRole } from './shared.steps.ts';

// Runs login and records the outcome on the world, like the real app would.
async function attemptLogin(world: ClubHouseWorld, email: string, password: string) {
  const result = await login({ email, password }, prisma);
  world.message = result.message;
  world.currentUser = result.success
    ? { id: result.session.accountId, email: result.session.email, role: result.session.role }
    : null;
}

// ---------- Given ----------

Given(
  '{int} consecutive failed login attempts were made for email {string}',
  async function (this: ClubHouseWorld, attempts: number, email: string) {
    for (let i = 0; i < attempts; i++) {
      await login({ email, password: 'WrongPass1!' }, prisma);
    }
    // Only the login in the scenario's When step should be observed.
    this.currentUser = null;
    this.message = null;
  },
);

// ---------- When ----------

When(
  'a user logs in with email {string} and password {string}',
  async function (this: ClubHouseWorld, email: string, password: string) {
    await attemptLogin(this, email, password);
  },
);

// ---------- Then ----------

Then(
  'the user is logged in as {string} with role {string}',
  function (this: ClubHouseWorld, email: string, role: string) {
    assert.ok(this.currentUser, `No user is logged in (message: ${this.message})`);
    assert.equal(this.currentUser.email, email);
    assert.equal(this.currentUser.role, parseRole(role));
  },
);

Then('no user is logged in', function (this: ClubHouseWorld) {
  assert.equal(this.currentUser, null);
});