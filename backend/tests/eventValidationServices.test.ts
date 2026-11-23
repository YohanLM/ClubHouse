import type { PrismaClient } from '@prisma/client';
import { createEvent } from '../src/services/createEvent';
import { editEvent } from '../src/services/editEvent';

const clock = () => new Date('2026-11-15T17:00:00Z');
const stored = {
  id: 20,
  clubId: 10,
  title: 'Workshop',
  category: 'Academic',
  date: '2026-11-01',
  startTime: '18:00',
  endTime: '20:00',
  location: 'McConnell 103',
  capacity: 30,
  status: 'SCHEDULED',
  club: { id: 10, ownerId: 2 },
};

const db = {
  club: { findUnique: jest.fn() },
  account: { findUnique: jest.fn() },
  event: { findUnique: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
  rSVP: { count: jest.fn() },
};
const prisma = db as unknown as PrismaClient;

beforeEach(() => {
  jest.resetAllMocks();
  db.club.findUnique.mockResolvedValue(stored.club);
  db.account.findUnique.mockResolvedValue({ id: 2, role: 'CLUB_OWNER' });
  db.event.findUnique.mockResolvedValue(stored);
  db.event.updateMany.mockResolvedValue({ count: 1 });
  db.rSVP.count.mockResolvedValue(0);
  db.event.create.mockImplementation(({ data }) => Promise.resolve({ id: 20, ...data }));
});

test('creation trims supplied fields before applying shared validation', async () => {
  const result = await createEvent({
    ...stored, actorId: 2, title: '  Workshop  ', date: ' 2026-12-03 ',
  }, prisma, clock);
  expect(result).toMatchObject({
    success: true, event: { title: 'Workshop', date: '2026-12-03' },
  });
});

test('an edit preserves omitted fields and the unchanged past date', async () => {
  const result = await editEvent({
    actorId: 2, eventId: 20, location: '  Trottier 0100  ',
  }, prisma, clock);
  expect(result).toMatchObject({
    success: true,
    event: { date: stored.date, title: stored.title, capacity: 30, location: 'Trottier 0100' },
  });
  expect(db.event.updateMany).toHaveBeenCalledWith({
    where: { id: 20, status: 'SCHEDULED' },
    data: {
      title: stored.title, category: stored.category, date: stored.date,
      startTime: stored.startTime, endTime: stored.endTime,
      location: 'Trottier 0100', capacity: 30,
    },
  });
});

test('an edit can explicitly remove the capacity limit', async () => {
  const result = await editEvent({ actorId: 2, eventId: 20, capacity: null }, prisma, clock);
  expect(result).toMatchObject({ success: true, event: { capacity: null } });
});

test.each([
  [{ title: null }, 'Title is required'],
  [{ title: '   ' }, 'Title is required'],
  [{ date: '2026-10-31' }, 'Event date cannot be past'],
  [{ endTime: '17:00' }, 'End time must be after start'],
  [{ capacity: 0 }, 'Capacity must be a positive integer'],
] as const)('both services reject %j before writing', async (changes, message) => {
  const created = await createEvent({
    ...stored, actorId: 2, date: '2026-12-03', ...changes,
  }, prisma, clock);
  const edited = await editEvent({ actorId: 2, eventId: 20, ...changes }, prisma, clock);
  expect(created).toEqual({ success: false, message });
  expect(edited).toEqual({ success: false, message });
  expect(db.event.create).not.toHaveBeenCalled();
  expect(db.event.updateMany).not.toHaveBeenCalled();
});
