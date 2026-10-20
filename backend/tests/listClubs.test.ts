import type { PrismaClient } from '@prisma/client';
import { listClubs } from '../src/services/listClubs';

const db = { account: { findUnique: jest.fn() }, club: { findMany: jest.fn() } };
const prisma = db as unknown as PrismaClient;
beforeEach(() => { jest.resetAllMocks(); });

test.each([null, 42])('rejects unauthenticated and deleted accounts (%s)', async (id) => {
  db.account.findUnique.mockResolvedValue(null);
  expect(await listClubs(id, prisma)).toEqual({ success: false, message: 'Login required', clubs: [] });
  expect(db.club.findMany).not.toHaveBeenCalled();
});

test.each(['USER', 'CLUB_OWNER', 'ADMINISTRATOR'])('allows %s to browse only active clubs alphabetically', async (role) => {
  db.account.findUnique.mockResolvedValue({ id: 1, role });
  db.club.findMany.mockResolvedValue([{ id: 1, name: 'Debate Union', category: 'Academic' }]);
  expect(await listClubs(1, prisma)).toEqual({ success: true, clubs: [{ id: 1, name: 'Debate Union', category: 'Academic' }] });
  expect(db.club.findMany).toHaveBeenCalledWith({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' },
    select: { id: true, name: true, category: true } });
});

test('returns an empty list when no active clubs exist', async () => {
  db.account.findUnique.mockResolvedValue({ id: 1 });
  db.club.findMany.mockResolvedValue([]);
  expect(await listClubs(1, prisma)).toEqual({ success: true, clubs: [] });
});
