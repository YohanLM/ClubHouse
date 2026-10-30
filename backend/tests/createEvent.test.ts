
import { PrismaClient } from '@prisma/client';
import {
  createEvent,
  CREATE_EVENT_ERRORS,
} from '../src/services/createEvent';

const prisma = {
  club: { findUnique: jest.fn() },
  account: { findUnique: jest.fn() },
  event: { create: jest.fn() },
} as unknown as PrismaClient;

// Fixed clock: October 20, 2026
const clock = () => new Date('2026-10-20T16:00:00Z');

const base = {
  actorId: 2,
  clubId: 10,
  title: 'Robotics Workshop',
  category: 'Academic',
  date: '2026-11-12',
  startTime: '18:00',
  endTime: '20:00',
  location: 'McConnell 103',
};

const event = {
  id: 20,
  ...base,
  capacity: null,
  status: 'SCHEDULED',
};

beforeEach(() => {
  jest.resetAllMocks();

  jest.mocked(prisma.club.findUnique).mockResolvedValue({
    id: 10,
    ownerId: 2,
  } as never);

  jest.mocked(prisma.account.findUnique).mockResolvedValue({
    id: 2,
    role: 'CLUB_OWNER',
  } as never);

  jest.mocked(prisma.event.create).mockImplementation(
  (({ data }: { data: Record<string, any> }) =>
    Promise.resolve({ ...event, ...data })) as any
);
});

test('creates an event successfully', async () => {
  const result = await createEvent(base, prisma, clock);

  expect(result).toMatchObject({
    success: true,
    message: 'Event created',
    event: {
      status: 'SCHEDULED',
      capacity: null,
    },
  });

  expect(prisma.event.create).toHaveBeenCalledTimes(1);
});

test('accepts a positive capacity', async () => {
  const result = await createEvent(
    { ...base, capacity: 50 },
    prisma,
    clock
  );

  expect(result).toMatchObject({
    success: true,
    event: { capacity: 50 },
  });
});

test.each([
  [{ ...base, title: ' ' }, CREATE_EVENT_ERRORS.titleRequired],
  [{ ...base, category: '' }, CREATE_EVENT_ERRORS.categoryRequired],
  [{ ...base, date: '2026-10-01' }, CREATE_EVENT_ERRORS.datePast],
  [{ ...base, date: '2026-02-30' }, CREATE_EVENT_ERRORS.dateInvalid],
  [{ ...base, startTime: '20:00', endTime: '18:00' }, CREATE_EVENT_ERRORS.endBeforeStart],
  [{ ...base, startTime: '18:00', endTime: '18:00' }, CREATE_EVENT_ERRORS.endBeforeStart],
  [{ ...base, startTime: '25:00' }, CREATE_EVENT_ERRORS.timeInvalid],
  [{ ...base, location: ' ' }, CREATE_EVENT_ERRORS.locationRequired],
  [{ ...base, capacity: 0 }, CREATE_EVENT_ERRORS.capacityInvalid],
  [{ ...base, capacity: -2 }, CREATE_EVENT_ERRORS.capacityInvalid],
  [{ ...base, capacity: 2.5 }, CREATE_EVENT_ERRORS.capacityInvalid],
] as const)('rejects invalid input', async (input, message) => {
  const result = await createEvent(input, prisma, clock);

  expect(result).toEqual({
    success: false,
    message,
  });

  expect(prisma.event.create).not.toHaveBeenCalled();
});

test('rejects a user who does not own the club', async () => {
  const result = await createEvent(
    { ...base, actorId: 3 },
    prisma,
    clock
  );

  expect(result).toEqual({
    success: false,
    message: CREATE_EVENT_ERRORS.unauthorized,
  });

  expect(prisma.event.create).not.toHaveBeenCalled();
});

test('rejects unauthenticated users', async () => {
  const result = await createEvent(
    { ...base, actorId: null },
    prisma,
    clock
  );

  expect(result.success).toBe(false);
});

test('rejects users without CLUB_OWNER role', async () => {
  jest.mocked(prisma.account.findUnique).mockResolvedValue({
    id: 2,
    role: 'USER',
  } as never);

  const result = await createEvent(base, prisma, clock);

  expect(result.success).toBe(false);
});

test('uses the injected clock', async () => {
  const input = {
    ...base,
    date: '2026-10-20',
  };

  const result = await createEvent(input, prisma, clock);

  expect(result.success).toBe(true);

  const futureClock = () =>
    new Date('2026-10-22T16:00:00Z');

  const expired = await createEvent(
    input,
    prisma,
    futureClock
  );

  expect(expired).toEqual({
    success: false,
    message: CREATE_EVENT_ERRORS.datePast,
  });
});
