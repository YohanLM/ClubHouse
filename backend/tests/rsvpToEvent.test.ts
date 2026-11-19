import { PrismaClient } from '@prisma/client';
import {
  rsvpToEvent,
  RSVP_TO_EVENT_ERRORS as E,
} from '../src/services/rsvpToEvent';

const prisma = {
  account: { findUnique: jest.fn() },
  event: { findUnique: jest.fn() },
  rSVP: { findUnique: jest.fn(), count: jest.fn(), upsert: jest.fn() },
} as unknown as PrismaClient;

const input = { actorId: 1, eventId: 20, response: 'Attending' };
const clock = () => new Date('2026-11-15T16:00:00Z');

function mockEvent(
  overrides: Partial<{ date: string; status: string; capacity: number | null }> = {}
) {
  jest.mocked(prisma.event.findUnique).mockResolvedValue({
    id: 20,
    date: '2026-12-03',
    status: 'SCHEDULED',
    capacity: null,
    ...overrides,
  } as never);
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(prisma.account.findUnique).mockResolvedValue({ id: 1 } as never);
  mockEvent();
  jest.mocked(prisma.rSVP.findUnique).mockResolvedValue(null);
  jest.mocked(prisma.rSVP.count)
    .mockResolvedValueOnce(0)
    .mockResolvedValueOnce(1);
});

test.each([
  ['Attending', 'ATTENDING', 1],
  ['Not Attending', 'NOT_ATTENDING', 0],
])('saves a new %s RSVP and returns the attendee count', async (value, response, count) => {
  jest.mocked(prisma.rSVP.count)
    .mockReset()
    .mockResolvedValueOnce(0)
    .mockResolvedValueOnce(count);

  const result = await rsvpToEvent({ ...input, response: value }, prisma, clock);

  expect(result).toEqual({
    success: true,
    message: 'RSVP saved',
    eventId: 20,
    response,
    attendeeCount: count,
  });
  expect(prisma.rSVP.upsert).toHaveBeenCalledWith({
    where: { accountId_eventId: { accountId: 1, eventId: 20 } },
    create: { accountId: 1, eventId: 20, response },
    update: { response },
  });
});

test('changes an existing RSVP and reports the updated attendee count', async () => {
  jest.mocked(prisma.rSVP.findUnique).mockResolvedValue({ response: 'ATTENDING' } as never);
  jest.mocked(prisma.rSVP.count)
    .mockReset()
    .mockResolvedValueOnce(1)
    .mockResolvedValueOnce(0);

  const result = await rsvpToEvent(
    { ...input, response: 'Not Attending' },
    prisma,
    clock
  );

  expect(result).toMatchObject({
    success: true,
    response: 'NOT_ATTENDING',
    attendeeCount: 0,
  });
  expect(prisma.rSVP.upsert).toHaveBeenCalledWith({
    where: { accountId_eventId: { accountId: 1, eventId: 20 } },
    create: { accountId: 1, eventId: 20, response: 'NOT_ATTENDING' },
    update: { response: 'NOT_ATTENDING' },
  });
});

test('rejects attending when capacity is full', async () => {
  mockEvent({ capacity: 1 });
  jest.mocked(prisma.rSVP.count).mockReset().mockResolvedValueOnce(1);

  const result = await rsvpToEvent(input, prisma, clock);

  expect(result).toEqual({ success: false, message: E.eventFull });
  expect(prisma.rSVP.upsert).not.toHaveBeenCalled();
});

test('allows an existing attendee to retain their RSVP when the event is full', async () => {
  mockEvent({ capacity: 1 });
  jest.mocked(prisma.rSVP.findUnique).mockResolvedValue({ response: 'ATTENDING' } as never);
  jest.mocked(prisma.rSVP.count)
    .mockReset()
    .mockResolvedValueOnce(1)
    .mockResolvedValueOnce(1);

  const result = await rsvpToEvent(input, prisma, clock);

  expect(result).toMatchObject({ success: true, attendeeCount: 1 });
  expect(prisma.rSVP.upsert).toHaveBeenCalled();
});

test.each([
  [{ status: 'COMPLETED' }, E.alreadyTakenPlace],
  [{ date: '2026-09-10' }, E.alreadyTakenPlace],
  [{ status: 'CANCELLED' }, E.eventCancelled],
])('rejects events that cannot be attended', async (event, message) => {
  mockEvent(event);

  const result = await rsvpToEvent(input, prisma, clock);

  expect(result).toEqual({ success: false, message });
  expect(prisma.rSVP.upsert).not.toHaveBeenCalled();
});

test('rejects invalid RSVP responses', async () => {
  const result = await rsvpToEvent({ ...input, response: 'Maybe' }, prisma, clock);

  expect(result).toEqual({ success: false, message: E.invalidResponse });
  expect(prisma.rSVP.upsert).not.toHaveBeenCalled();
});

test('requires a logged-in existing account', async () => {
  const anonymous = await rsvpToEvent({ ...input, actorId: null }, prisma, clock);
  expect(anonymous).toEqual({ success: false, message: E.loginRequired });

  jest.mocked(prisma.account.findUnique).mockResolvedValue(null);
  const missingAccount = await rsvpToEvent(input, prisma, clock);
  expect(missingAccount).toEqual({ success: false, message: E.loginRequired });
});

test('rejects an RSVP to an event that does not exist', async () => {
  jest.mocked(prisma.event.findUnique).mockResolvedValue(null);

  const result = await rsvpToEvent(input, prisma, clock);

  expect(result).toEqual({ success: false, message: E.eventNotFound });
  expect(prisma.rSVP.upsert).not.toHaveBeenCalled();
});

test('accepts an RSVP to an event taking place today', async () => {
  mockEvent({ date: '2026-11-15' });

  const result = await rsvpToEvent(input, prisma, clock);

  expect(result).toMatchObject({ success: true, response: 'ATTENDING' });
});

test.each([undefined, null, '', '   '])(
  'rejects a missing RSVP response (%p)',
  async (response) => {
    const result = await rsvpToEvent({ ...input, response }, prisma, clock);

    expect(result).toEqual({ success: false, message: E.invalidResponse });
    expect(prisma.rSVP.upsert).not.toHaveBeenCalled();
  }
);

test.each([
  ['  attending  ', 'ATTENDING'],
  ['not   attending', 'NOT_ATTENDING'],
  ['NOT_ATTENDING', 'NOT_ATTENDING'],
])('normalizes the response %p to %s', async (value, response) => {
  const result = await rsvpToEvent({ ...input, response: value }, prisma, clock);

  expect(result).toMatchObject({ success: true, response });
});

test('accepts attending when the event still has room', async () => {
  mockEvent({ capacity: 2 });
  jest.mocked(prisma.rSVP.count)
    .mockReset()
    .mockResolvedValueOnce(1)
    .mockResolvedValueOnce(2);

  const result = await rsvpToEvent(input, prisma, clock);

  expect(result).toMatchObject({ success: true, attendeeCount: 2 });
  expect(prisma.rSVP.upsert).toHaveBeenCalled();
});

test('allows declining an event that is full', async () => {
  mockEvent({ capacity: 1 });
  jest.mocked(prisma.rSVP.count)
    .mockReset()
    .mockResolvedValueOnce(1)
    .mockResolvedValueOnce(1);

  const result = await rsvpToEvent(
    { ...input, response: 'Not Attending' },
    prisma,
    clock
  );

  expect(result).toMatchObject({
    success: true,
    response: 'NOT_ATTENDING',
    attendeeCount: 1,
  });
});

test('does not query the database when nobody is logged in', async () => {
  await rsvpToEvent({ ...input, actorId: null }, prisma, clock);

  expect(prisma.account.findUnique).not.toHaveBeenCalled();
  expect(prisma.event.findUnique).not.toHaveBeenCalled();
});
