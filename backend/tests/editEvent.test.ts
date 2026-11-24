import assert from 'node:assert/strict';
import type { PrismaClient } from '@prisma/client';
import { editEvent, type EditEventInput } from '../src/services/editEvent';

const fields = {
  title: 'Robotics Workshop', category: 'Academic', date: '2026-12-03',
  startTime: '18:00', endTime: '20:00', location: 'McConnell 103', capacity: 20,
};
const event = { id: 20, clubId: 10, club: { ownerId: 2 }, status: 'SCHEDULED', ...fields };
const clock = () => new Date('2026-11-24T17:00:00Z');

function fixture({
  initial = event as typeof event | null, role = 'CLUB_OWNER' as string | null,
  count = 1, finalStatus = 'CANCELLED',
} = {}) {
  const writes: unknown[] = [];
  const rsvps: unknown[] = [];
  let reads = 0;
  const db = {
    event: {
      findUnique: async () => ++reads === 1 ? initial : { status: finalStatus },
      updateMany: async (args: unknown) => { writes.push(args); return { count }; },
    },
    account: { findUnique: async () => role === null ? null : { role } },
    rSVP: { count: async (args: unknown) => { rsvps.push(args); return 3; } },
  };
  const edit = (patch: Partial<EditEventInput> = {}) =>
    editEvent({ eventId: 20, actorId: 2, ...patch }, db as unknown as PrismaClient, clock);
  return { edit, writes, rsvps };
}

test('owner edits one field, preserves the other fields and gets the attending count', async () => {
  const { edit, writes, rsvps } = fixture();
  const data = { ...fields, location: 'Trottier' };
  assert.deepEqual(await edit({ location: '  Trottier  ' }), {
    success: true, message: 'Event updated',
    event: { ...data, id: 20, clubId: 10, status: 'SCHEDULED', attendeeCount: 3 },
  });
  assert.deepEqual(writes, [{ where: { id: 20, status: 'SCHEDULED' }, data }]);
  assert.deepEqual(rsvps, [{ where: { eventId: 20, response: 'ATTENDING' } }]);
});

test('explicit null removes capacity; omitting capacity preserves it', async () => {
  const { edit, writes } = fixture();
  const result = await edit({ capacity: null });
  assert.ok(result.success);
  assert.equal(result.event.capacity, null);
  assert.deepEqual(writes, [{
    where: { id: 20, status: 'SCHEDULED' }, data: { ...fields, capacity: null },
  }]);
});

type Case = [string, Parameters<typeof fixture>[0], Partial<EditEventInput>, string];
const rejected: Case[] = [
  ['logged out', {}, { actorId: null }, 'Unauthorized user'],
  ['non-owner', {}, { actorId: 8 }, 'Unauthorized user'],
  ['owner account missing', { role: null }, {}, 'Unauthorized user'],
  ['owner role revoked', { role: 'USER' }, {}, 'Unauthorized user'],
  ['event missing', { initial: null }, {}, 'Event not found'],
  ['cancelled', { initial: { ...event, status: 'CANCELLED' } }, {}, 'Cancelled events cannot be edited'],
  ['completed', { initial: { ...event, status: 'COMPLETED' } }, {}, 'Completed events cannot be edited'],
  ['blank title', {}, { title: '  ' }, 'Title is required'],
  ['changed date is in the past', {}, { date: '2026-11-23' }, 'Event date cannot be past'],
  ['new start equals unchanged end', {}, { startTime: '20:00' }, 'End time must be after start'],
  ['zero capacity', {}, { capacity: 0 }, 'Capacity must be a positive integer'],
];
for (const [label, setup, patch, message] of rejected) {
  test('rejects edit: ' + label, async () => {
    const { edit, writes, rsvps } = fixture(setup);
    assert.deepEqual(await edit(patch), { success: false, message });
    assert.deepEqual(writes, []);
    assert.deepEqual(rsvps, []);
  });
}

test('an unrelated edit may keep the existing past date', async () => {
  const { edit } = fixture({ initial: { ...event, date: '2026-11-23' } });
  const result = await edit({ title: 'Updated title' });
  assert.ok(result.success);
  assert.equal(result.event.date, '2026-11-23');
  assert.equal(result.event.title, 'Updated title');
});

for (const [status, message] of [
  ['CANCELLED', 'Cancelled events cannot be edited'],
  ['COMPLETED', 'Completed events cannot be edited'],
]) {
  test('handles concurrent status change to ' + status, async () => {
    const { edit, writes, rsvps } = fixture({ count: 0, finalStatus: status });
    assert.deepEqual(await edit({ capacity: 12 }), { success: false, message });
    assert.deepEqual(writes, [{
      where: { id: 20, status: 'SCHEDULED' }, data: { ...fields, capacity: 12 },
    }]);
    assert.deepEqual(rsvps, []);
  });
}
