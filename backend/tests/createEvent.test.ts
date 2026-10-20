import type { PrismaClient } from '@prisma/client';
import { createEvent, type CreateEventInput } from '../src/services/createEvent';

const db = { club: { findUnique: jest.fn() }, event: { create: jest.fn() }, $transaction: jest.fn() };
const prisma = db as unknown as PrismaClient;
const input: CreateEventInput = { clubName: 'Robotics Club', title: 'Workshop', category: 'Academic',
  date: '2026-11-12', startTime: '18:00', endTime: '20:00', location: 'McConnell 103' };
const clock = () => new Date('2026-10-20T12:00:00Z');

beforeEach(() => {
  jest.resetAllMocks();
  db.$transaction.mockImplementation((action) => action(db));
  db.club.findUnique.mockResolvedValue({ id: 1, ownerId: 2 });
  db.event.create.mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data }));
});

test('creates a scheduled event with all form fields', async () => {
  const result = await createEvent({ ...input, capacity: 50 }, 2, prisma, clock);
  expect(result.success).toBe(true);
  expect(db.event.create).toHaveBeenCalledWith({ data: { clubId: 1, title: input.title, category: input.category,
    date: input.date, startTime: input.startTime, endTime: input.endTime, location: input.location,
    capacity: 50, status: 'SCHEDULED' } });
});

test('keeps omitted capacity unlimited', async () => {
  await createEvent(input, 2, prisma, clock);
  expect(db.event.create.mock.calls[0][0].data.capacity).toBeNull();
});

test.each([null, 99])('rejects a missing session or a different club owner (%s)', async (id) => {
  expect(await createEvent(input, id, prisma, clock)).toEqual({ success: false, message: 'Unauthorized user' });
  expect(db.event.create).not.toHaveBeenCalled();
});

test('rejects a missing club', async () => {
  db.club.findUnique.mockResolvedValue(null);
  expect(await createEvent(input, 2, prisma, clock)).toEqual({ success: false, message: 'Unauthorized user' });
});

test.each<[Partial<CreateEventInput>, string]>([
  [{ title: ' ' }, 'Title is required'],
  [{ category: '' }, 'Category is required'],
  [{ date: '2026-10-19' }, 'Event date cannot be past'],
  [{ date: '2026-02-30' }, 'Invalid event date'],
  [{ date: '2026-2-3' }, 'Invalid event date'],
  [{ date: '' }, 'Invalid event date'],
  [{ startTime: '24:00' }, 'Invalid event time'],
  [{ endTime: '20:60' }, 'Invalid event time'],
  [{ endTime: '18:00' }, 'End time must be after start'],
  [{ endTime: '17:00' }, 'End time must be after start'],
  [{ location: ' ' }, 'Location is required'],
  [{ capacity: 0 }, 'Capacity must be a positive integer'],
  [{ capacity: -1 }, 'Capacity must be a positive integer'],
  [{ capacity: 1.5 }, 'Capacity must be a positive integer'],
  [{ capacity: Number.NaN }, 'Capacity must be a positive integer'],
  [{ capacity: Number.MAX_SAFE_INTEGER + 1 }, 'Capacity must be a positive integer'],
])('rejects invalid event fields (%j)', async (invalid, message) => {
  expect(await createEvent({ ...input, ...invalid }, 2, prisma, clock)).toEqual({ success: false, message });
  expect(db.event.create).not.toHaveBeenCalled();
});

test('uses Montreal calendar date even when UTC has moved to the next day', async () => {
  const lateEvening = () => new Date('2026-10-21T01:00:00Z');
  expect((await createEvent({ ...input, date: '2026-10-20' }, 2, prisma, lateEvening)).success).toBe(true);
});

test('rejects the previous day after Montreal midnight', async () => {
  const nextDay = () => new Date('2026-10-21T04:01:00Z');
  expect(await createEvent({ ...input, date: '2026-10-20' }, 2, prisma, nextDay))
    .toEqual({ success: false, message: 'Event date cannot be past' });
});
