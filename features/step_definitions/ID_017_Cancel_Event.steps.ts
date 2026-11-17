import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import { prisma } from '../../backend/src/prisma.ts';
import { cancelEvent } from '../../backend/src/services/cancelEvent.ts';
import type { ClubHouseWorld } from '../support/world.ts';
import { findEventByTitle } from './shared.steps.ts';

async function cancel(
  world: ClubHouseWorld,
  title: string,
  reason?: string,
) {
  const before = await findEventByTitle(title);

  const result = await cancelEvent(
    {
      actorId: world.currentUser?.id ?? null,
      eventId: before.id,
      reason,
    },
    prisma,
  );

  world.message = result.message;

  const after = await findEventByTitle(title);

  if (result.success) {
    assert.equal(after.status, 'CANCELLED');
    assert.equal(after.cancellationReason, reason?.trim() || null);
  } else {
    assert.deepEqual(
      after,
      before,
      'A rejected cancellation must not change the event',
    );
  }
}

When(
  'the user cancels the event {string}',
  async function (this: ClubHouseWorld, title: string) {
    await cancel(this, title);
  },
);

When(
  'the user cancels the event {string} with the reason {string}',
  async function (
    this: ClubHouseWorld,
    title: string,
    reason: string,
  ) {
    await cancel(this, title, reason);
  },
);

Then(
  'the event {string} has the cancellation reason {string}',
  async function (title: string, reason: string) {
    const event = await findEventByTitle(title);
    assert.equal(event.cancellationReason, reason);
  },
);
