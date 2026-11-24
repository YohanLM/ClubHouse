import { PrismaClient } from '@prisma/client';
import { getCalendar, GET_CALENDAR_ERRORS as E } from '../src/services/getCalendar';

const prisma = {
  account: { findUnique: jest.fn() },
  event: { findMany: jest.fn() },
} as unknown as PrismaClient;

// Noon in Montreal on 2026-11-15.
const clock = () => new Date('2026-11-15T12:00:00-05:00');
const USER_ID = 1;

const debateFinals = {
  id: 2,
  clubId: 20,
  title: 'Debate Finals',
  category: 'Academic',
  date: '2026-11-20',
  startTime: '17:00',
  endTime: '19:00',
  location: 'Leacock 132',
  status: 'SCHEDULED',
  club: { name: 'Debate Union' },
  _count: { rsvps: 3 },
};

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(prisma.account.findUnique).mockResolvedValue({ id: USER_ID } as never);
  jest.mocked(prisma.event.findMany).mockResolvedValue([debateFinals] as never);
});

function findManyArgs() {
  return jest.mocked(prisma.event.findMany).mock.calls[0][0];
}

test('lists upcoming scheduled events in chronological order with their club name', async () => {
  const result = await getCalendar({ actorId: USER_ID }, prisma, clock);

  expect(result).toEqual({
    success: true,
    events: [
      {
        id: 2,
        clubId: 20,
        clubName: 'Debate Union',
        title: 'Debate Finals',
        category: 'Academic',
        date: '2026-11-20',
        startTime: '17:00',
        endTime: '19:00',
        location: 'Leacock 132',
        attendeeCount: 3,
      },
    ],
  });
  expect(findManyArgs()).toEqual({
    where: { status: 'SCHEDULED', date: { gte: '2026-11-15' } },
    include: {
      club: { select: { name: true } },
      _count: { select: { rsvps: { where: { response: 'ATTENDING' } } } },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { title: 'asc' }],
  });
});

test('limits the events to the requested date range', async () => {
  await getCalendar({ actorId: USER_ID, from: '2026-12-01', to: '2026-12-31' }, prisma, clock);

  expect(findManyArgs()?.where).toEqual({
    status: 'SCHEDULED',
    date: { gte: '2026-12-01', lte: '2026-12-31' },
  });
});

test('never lists past events, even when the range starts before today', async () => {
  await getCalendar({ actorId: USER_ID, from: '2026-11-01', to: '2026-11-30' }, prisma, clock);

  expect(findManyArgs()?.where).toEqual({
    status: 'SCHEDULED',
    date: { gte: '2026-11-15', lte: '2026-11-30' },
  });
});

test('accepts a range of a single day', async () => {
  const result = await getCalendar(
    { actorId: USER_ID, from: '2026-11-20', to: '2026-11-20' },
    prisma,
    clock,
  );

  expect(result.success).toBe(true);
});

test('uses the Montreal date for "today"', async () => {
  // 01:00 UTC on Nov 16 is still Nov 15 in Montreal.
  await getCalendar({ actorId: USER_ID }, prisma, () => new Date('2026-11-16T01:00:00Z'));

  expect(findManyArgs()?.where).toMatchObject({ date: { gte: '2026-11-15' } });
});

test('rejects a range whose end is before its start', async () => {
  const result = await getCalendar(
    { actorId: USER_ID, from: '2026-12-31', to: '2026-12-01' },
    prisma,
    clock,
  );

  expect(result).toEqual({ success: false, message: E.invalidRange });
  expect(prisma.event.findMany).not.toHaveBeenCalled();
});

test.each([
  [{ from: '2026-13-01' }],
  [{ to: '2026-02-30' }],
  [{ from: 'tomorrow' }],
])('rejects an invalid date (%p)', async range => {
  const result = await getCalendar({ actorId: USER_ID, ...range }, prisma, clock);

  expect(result).toEqual({ success: false, message: E.invalidDate });
  expect(prisma.event.findMany).not.toHaveBeenCalled();
});

test('rejects users who are not logged in', async () => {
  const result = await getCalendar({ actorId: null }, prisma, clock);

  expect(result).toEqual({ success: false, message: E.loginRequired });
  expect(prisma.account.findUnique).not.toHaveBeenCalled();
  expect(prisma.event.findMany).not.toHaveBeenCalled();
});

test('rejects an actor whose account no longer exists', async () => {
  jest.mocked(prisma.account.findUnique).mockResolvedValue(null);

  const result = await getCalendar({ actorId: 99 }, prisma, clock);

  expect(result).toEqual({ success: false, message: E.loginRequired });
  expect(prisma.event.findMany).not.toHaveBeenCalled();
});

test('looks up the account of the logged-in user', async () => {
  await getCalendar({ actorId: USER_ID }, prisma, clock);

  expect(prisma.account.findUnique).toHaveBeenCalledWith({ where: { id: USER_ID } });
});

test('returns an empty calendar when there are no upcoming events', async () => {
  jest.mocked(prisma.event.findMany).mockResolvedValue([]);

  const result = await getCalendar({ actorId: USER_ID }, prisma, clock);

  expect(result).toEqual({ success: true, events: [] });
});

test('keeps the order returned by the database and maps every event', async () => {
  const chessNight = {
    ...debateFinals,
    id: 5,
    clubId: 30,
    title: 'Chess Night',
    category: 'Social',
    date: '2026-11-16',
    startTime: '18:00',
    endTime: '21:00',
    location: 'SSMU 107',
    club: { name: 'Chess Club' },
    _count: { rsvps: 0 },
  };
  jest.mocked(prisma.event.findMany).mockResolvedValue([chessNight, debateFinals] as never);

  const result = await getCalendar({ actorId: USER_ID }, prisma, clock);

  expect(result.success).toBe(true);
  if (!result.success) return;
  expect(result.events.map(e => e.title)).toEqual(['Chess Night', 'Debate Finals']);
  expect(result.events[0]).toEqual({
    id: 5,
    clubId: 30,
    clubName: 'Chess Club',
    title: 'Chess Night',
    category: 'Social',
    date: '2026-11-16',
    startTime: '18:00',
    endTime: '21:00',
    location: 'SSMU 107',
    attendeeCount: 0,
  });
});

test('does not expose internal fields such as the event status', async () => {
  const result = await getCalendar({ actorId: USER_ID }, prisma, clock);

  expect(result.success).toBe(true);
  if (!result.success) return;
  expect(result.events[0]).not.toHaveProperty('status');
  expect(result.events[0]).not.toHaveProperty('club');
  expect(result.events[0]).not.toHaveProperty('_count');
});

test('starts at a future "from" date with no upper limit when "to" is omitted', async () => {
  await getCalendar({ actorId: USER_ID, from: '2026-12-01' }, prisma, clock);

  expect(findManyArgs()?.where).toEqual({
    status: 'SCHEDULED',
    date: { gte: '2026-12-01' },
  });
});

test('starts today when only "to" is given', async () => {
  await getCalendar({ actorId: USER_ID, to: '2026-11-30' }, prisma, clock);

  expect(findManyArgs()?.where).toEqual({
    status: 'SCHEDULED',
    date: { gte: '2026-11-15', lte: '2026-11-30' },
  });
});

test('includes events happening today when "from" is today', async () => {
  await getCalendar({ actorId: USER_ID, from: '2026-11-15' }, prisma, clock);

  expect(findManyArgs()?.where).toMatchObject({ date: { gte: '2026-11-15' } });
});

test('treats blank or null range values as no limit', async () => {
  const result = await getCalendar({ actorId: USER_ID, from: '', to: null }, prisma, clock);

  expect(result.success).toBe(true);
  expect(findManyArgs()?.where).toEqual({
    status: 'SCHEDULED',
    date: { gte: '2026-11-15' },
  });
});

test('queries an empty window when the whole range is in the past', async () => {
  jest.mocked(prisma.event.findMany).mockResolvedValue([]);

  const result = await getCalendar(
    { actorId: USER_ID, from: '2026-10-01', to: '2026-10-31' },
    prisma,
    clock,
  );

  expect(result).toEqual({ success: true, events: [] });
  expect(findManyArgs()?.where).toEqual({
    status: 'SCHEDULED',
    date: { gte: '2026-11-15', lte: '2026-10-31' },
  });
});

test('reports an invalid date before checking the range order', async () => {
  const result = await getCalendar(
    { actorId: USER_ID, from: '2026-12-31', to: '2026-02-30' },
    prisma,
    clock,
  );

  expect(result).toEqual({ success: false, message: E.invalidDate });
});

test('checks login before validating the dates', async () => {
  const result = await getCalendar({ actorId: null, from: 'not-a-date' }, prisma, clock);

  expect(result).toEqual({ success: false, message: E.loginRequired });
});
