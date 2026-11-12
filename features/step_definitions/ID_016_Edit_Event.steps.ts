// Step definitions for ID_016 Edit Event (T064).
// Reuses the Background and shared steps (ID_015 / shared.steps.ts).

import assert from 'node:assert/strict';
import { BeforeStep, Then } from '@cucumber/cucumber';
import type { Event } from '@prisma/client';
import { prisma } from '../../backend/src/prisma.ts';
import type { ClubHouseWorld } from '../support/world.ts';
import { findEventByTitle } from './shared.steps.ts';

export type EditWorld = ClubHouseWorld & {
  today?: string;
  /** Every event as it was just before the When step ran. */
  eventsBefore?: Event[];
};

const FIELDS = {
  title: 'title',
  date: 'date',
  'start time': 'startTime',
  'end time': 'endTime',
  location: 'location',
  capacity: 'capacity',
} as const;

export function parseField(field: string): (typeof FIELDS)[keyof typeof FIELDS] {
  const parsed = FIELDS[field as keyof typeof FIELDS];
  if (!parsed) throw new Error(`Unknown event field "${field}"`);
  return parsed;
}

// Snapshot all events right before the action so "is unchanged" can compare.
BeforeStep(async function (this: EditWorld, { pickleStep }) {
  if (pickleStep.type === 'Action') {
    this.eventsBefore = await prisma.event.findMany({ orderBy: { id: 'asc' } });
  }
});

Then(
  'the event {string} has the {string} {string}',
  async function (title: string, field: string, expected: string) {
    const event = await findEventByTitle(title);
    const key = parseField(field);
    assert.equal(String(event[key]), expected);
  },
);

Then('the event {string} is unchanged', async function (this: EditWorld, title: string) {
  const after = await findEventByTitle(title);
  const before = this.eventsBefore?.find((e) => e.id === after.id);
  assert.ok(before, 'No snapshot taken: the When step must run before this check');
  assert.deepEqual(after, before);
});
