import { PrismaClient } from '@prisma/client';
import { listOwnedEvents } from '../src/services/listOwnedEvents';

const prisma = {
  account: { findUnique: jest.fn() },
  event: { findMany: jest.fn() },
} as unknown as PrismaClient;

const DANA_ID = 3;

const workshop = {
  id: 4,
  clubId: 10,
  title: 'Robotics Workshop',
  category: 'Academic',
  date: '2026-12-03',
  startTime: '18:00',
  endTime: '20:00',
  location: 'Trottier 0100',
  capacity: 40,
  status: 'SCHEDULED',
  club: { name: 'Robotics Club' },
};

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(prisma.account.findUnique).mockResolvedValue({ id: DANA_ID, role: 'CLUB_OWNER' } as never);
  jest.mocked(prisma.event.findMany).mockResolvedValue([workshop] as never);
});

test('lists the scheduled events of the clubs the owner owns, with their editable fields', async () => {
  const result = await listOwnedEvents({ actorId: DANA_ID }, prisma);

  expect(result).toEqual({
    success: true,
    events: [
      {
        id: 4,
        clubId: 10,
        clubName: 'Robotics Club',
        title: 'Robotics Workshop',
        category: 'Academic',
        date: '2026-12-03',
        startTime: '18:00',
        endTime: '20:00',
        location: 'Trottier 0100',
        capacity: 40,
      },
    ],
  });
  expect(prisma.event.findMany).toHaveBeenCalledWith({
    where: { status: 'SCHEDULED', club: { ownerId: DANA_ID } },
    include: { club: { select: { name: true } } },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { title: 'asc' }],
  });
});

test('returns no events for a user who is not a Club Owner', async () => {
  jest.mocked(prisma.account.findUnique).mockResolvedValue({ id: 7, role: 'USER' } as never);

  const result = await listOwnedEvents({ actorId: 7 }, prisma);

  expect(result).toEqual({ success: true, events: [] });
  expect(prisma.event.findMany).not.toHaveBeenCalled();
});

test('rejects a request when nobody is logged in', async () => {
  const result = await listOwnedEvents({ actorId: null }, prisma);

  expect(result).toEqual({ success: false, message: 'Login required' });
  expect(prisma.account.findUnique).not.toHaveBeenCalled();
});

test('rejects an actor whose account no longer exists', async () => {
  jest.mocked(prisma.account.findUnique).mockResolvedValue(null);

  const result = await listOwnedEvents({ actorId: 99 }, prisma);

  expect(result).toEqual({ success: false, message: 'Login required' });
  expect(prisma.event.findMany).not.toHaveBeenCalled();
});
