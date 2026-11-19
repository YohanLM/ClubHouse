import { PrismaClient } from '@prisma/client';
import { listFollowedClubs } from '../src/services/listFollowedClubs';

const prisma = {
  account: { findUnique: jest.fn() },
  follow: { findMany: jest.fn() },
} as unknown as PrismaClient;

const ALICE_ID = 1;

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(prisma.account.findUnique).mockResolvedValue({ id: ALICE_ID, role: 'USER' } as never);
});

test('returns the ids of the clubs the user follows', async () => {
  jest.mocked(prisma.follow.findMany).mockResolvedValue([{ clubId: 10 }, { clubId: 13 }] as never);

  const result = await listFollowedClubs({ actorId: ALICE_ID }, prisma);

  expect(result).toEqual({ success: true, clubIds: [10, 13] });
  expect(prisma.follow.findMany).toHaveBeenCalledWith({
    where: { accountId: ALICE_ID },
    select: { clubId: true },
  });
});

test('returns an empty list when the user follows no club', async () => {
  jest.mocked(prisma.follow.findMany).mockResolvedValue([]);

  const result = await listFollowedClubs({ actorId: ALICE_ID }, prisma);

  expect(result).toEqual({ success: true, clubIds: [] });
});

test('rejects a request when nobody is logged in', async () => {
  const result = await listFollowedClubs({ actorId: null }, prisma);

  expect(result).toEqual({ success: false, message: 'Login required' });
  expect(prisma.account.findUnique).not.toHaveBeenCalled();
  expect(prisma.follow.findMany).not.toHaveBeenCalled();
});

test('rejects an actor account that does not exist', async () => {
  jest.mocked(prisma.account.findUnique).mockResolvedValue(null);

  const result = await listFollowedClubs({ actorId: 999 }, prisma);

  expect(result).toEqual({ success: false, message: 'Login required' });
  expect(prisma.follow.findMany).not.toHaveBeenCalled();
});
