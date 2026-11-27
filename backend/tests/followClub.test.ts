import { PrismaClient } from '@prisma/client';
import { followClub, FOLLOW_CLUB_ERRORS as E } from '../src/services/followClub';

const prisma = {
  account: { findUnique: jest.fn() },
  club: { findUnique: jest.fn() },
  follow: { findUnique: jest.fn(), create: jest.fn(), count: jest.fn() },
} as unknown as PrismaClient;

// Accounts and club from the ID_011 feature
const ALICE_ID = 1;
const ROBOTICS_ID = 10;
const base = { actorId: ALICE_ID, clubId: ROBOTICS_ID };
const key = { accountId: ALICE_ID, clubId: ROBOTICS_ID };

function mockClub(status = 'ACTIVE') {
  jest.mocked(prisma.club.findUnique).mockResolvedValue({
    id: ROBOTICS_ID,
    name: 'Robotics Club',
    status,
    ownerId: 2,
  } as never);
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(prisma.account.findUnique).mockResolvedValue({
    id: ALICE_ID,
    role: 'USER',
  } as never);
  mockClub();
  jest.mocked(prisma.follow.findUnique).mockResolvedValue(null);
  jest.mocked(prisma.follow.create).mockResolvedValue(key as never);
  jest.mocked(prisma.follow.count).mockResolvedValue(1);
});

test('follows an active club and returns the follower count', async () => {
  const result = await followClub(base, prisma);

  expect(result).toEqual({
    success: true,
    message: 'Club followed',
    clubId: ROBOTICS_ID,
    followerCount: 1,
  });
  expect(prisma.follow.create).toHaveBeenCalledWith({ data: key });
  expect(prisma.follow.count).toHaveBeenCalledWith({ where: { clubId: ROBOTICS_ID } });
});

test('counts the followers after the new follow', async () => {
  jest.mocked(prisma.follow.count).mockResolvedValue(4);

  const result = await followClub(base, prisma);

  expect(result).toMatchObject({ success: true, followerCount: 4 });
});

test('keeps the existing follow when the club is already followed', async () => {
  jest.mocked(prisma.follow.findUnique).mockResolvedValue(key as never);

  const result = await followClub(base, prisma);

  expect(result).toEqual({
    success: true,
    message: 'Club already followed',
    clubId: ROBOTICS_ID,
    followerCount: 1,
  });
  expect(prisma.follow.findUnique).toHaveBeenCalledWith({
    where: { accountId_clubId: key },
  });
  expect(prisma.follow.create).not.toHaveBeenCalled();
});

test('reports an already followed club when a concurrent request created the follow', async () => {
  jest.mocked(prisma.follow.create).mockRejectedValue(
    Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
  );

  const result = await followClub(base, prisma);

  expect(result).toMatchObject({ success: true, message: 'Club already followed' });
});

test.each([
  ['a club owner', 'CLUB_OWNER'],
  ['an administrator', 'ADMINISTRATOR'],
])('lets %s follow a club', async (_description, role) => {
  jest.mocked(prisma.account.findUnique).mockResolvedValue({ id: ALICE_ID, role } as never);

  const result = await followClub(base, prisma);

  expect(result).toMatchObject({ success: true, message: 'Club followed' });
});

test('rejects a request when nobody is logged in', async () => {
  const result = await followClub({ ...base, actorId: null }, prisma);

  expect(result).toEqual({ success: false, message: E.loginRequired });
  expect(prisma.account.findUnique).not.toHaveBeenCalled();
  expect(prisma.follow.create).not.toHaveBeenCalled();
});

test('rejects an actor account that does not exist', async () => {
  jest.mocked(prisma.account.findUnique).mockResolvedValue(null);

  const result = await followClub({ ...base, actorId: 999 }, prisma);

  expect(result).toEqual({ success: false, message: E.loginRequired });
  expect(prisma.club.findUnique).not.toHaveBeenCalled();
});

test('accepts an actor id of 0 as a logged-in id', async () => {
  jest.mocked(prisma.account.findUnique).mockResolvedValue({ id: 0, role: 'USER' } as never);

  const result = await followClub({ ...base, actorId: 0 }, prisma);

  expect(result.success).toBe(true);
  expect(prisma.follow.create).toHaveBeenCalledWith({
    data: { accountId: 0, clubId: ROBOTICS_ID },
  });
});

test('rejects an unknown club', async () => {
  jest.mocked(prisma.club.findUnique).mockResolvedValue(null);

  const result = await followClub({ ...base, clubId: 999 }, prisma);

  expect(result).toEqual({ success: false, message: E.clubNotFound });
  expect(prisma.club.findUnique).toHaveBeenCalledWith({ where: { id: 999 } });
  expect(prisma.follow.create).not.toHaveBeenCalled();
});

test('rejects an inactive club', async () => {
  mockClub('INACTIVE');

  const result = await followClub(base, prisma);

  expect(result).toEqual({ success: false, message: E.clubInactive });
  expect(prisma.follow.findUnique).not.toHaveBeenCalled();
  expect(prisma.follow.create).not.toHaveBeenCalled();
});

test('rethrows unexpected database errors', async () => {
  jest.mocked(prisma.follow.create).mockRejectedValue(new Error('Database offline'));

  await expect(followClub(base, prisma)).rejects.toThrow('Database offline');
  expect(prisma.follow.count).not.toHaveBeenCalled();
});
