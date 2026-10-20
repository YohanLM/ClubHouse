import type { PrismaClient } from '@prisma/client';
import { createClub } from '../src/services/createClub';

const db = { account: { findUnique: jest.fn(), update: jest.fn() },
  club: { findUnique: jest.fn(), create: jest.fn() }, $transaction: jest.fn() };
const prisma = db as unknown as PrismaClient;
const input = { name: ' Jazz Society ', category: ' Arts ', ownerEmail: ' EVAN@MCGILL.CA ' };
const club = { id: 1, name: 'Jazz Society', category: 'Arts', ownerId: 2, status: 'ACTIVE' };

beforeEach(() => {
  jest.resetAllMocks();
  db.$transaction.mockImplementation((action) => action(db));
  db.account.findUnique.mockImplementation(({ where }) => Promise.resolve(
    'id' in where ? { id: 1, role: 'ADMINISTRATOR' } : { id: 2, role: 'USER' }));
  db.club.findUnique.mockResolvedValue(null);
  db.club.create.mockResolvedValue(club);
});

test('creates an active club and promotes the owner in one transaction', async () => {
  expect(await createClub(input, 1, prisma)).toEqual({ success: true, message: 'Club created', club });
  expect(db.club.create).toHaveBeenCalledWith({ data: { name: 'Jazz Society', category: 'Arts', ownerId: 2, status: 'ACTIVE' } });
  expect(db.account.findUnique).toHaveBeenCalledWith({ where: { email: 'evan@mcgill.ca' } });
  expect(db.account.update).toHaveBeenCalledWith({ where: { id: 2 }, data: { role: 'CLUB_OWNER' } });
});

test.each(['USER', 'CLUB_OWNER', null])('rejects a non-administrator or deleted session (%s)', async (role) => {
  db.account.findUnique.mockResolvedValue(role ? { id: 1, role } : null);
  expect(await createClub(input, 1, prisma)).toEqual({ success: false, message: 'Unauthorized user' });
  expect(db.club.create).not.toHaveBeenCalled();
});

test('rejects a missing session', async () => {
  expect(await createClub(input, null, prisma)).toEqual({ success: false, message: 'Unauthorized user' });
  expect(db.account.findUnique).not.toHaveBeenCalled();
});

test.each([
  [{ ...input, name: ' ' }, 'Club name is required'],
  [{ ...input, category: '' }, 'Category is required'],
])('validates required form fields: %j', async (invalid, message) => {
  expect(await createClub(invalid, 1, prisma)).toEqual({ success: false, message });
  expect(db.club.create).not.toHaveBeenCalled();
});

test('rejects duplicates without promoting an owner', async () => {
  db.club.findUnique.mockResolvedValue(club);
  expect(await createClub(input, 1, prisma)).toEqual({ success: false, message: 'Club name already exists' });
  expect(db.account.update).not.toHaveBeenCalled();
});

test('rejects unknown owners', async () => {
  db.account.findUnique.mockImplementation(({ where }) => Promise.resolve('id' in where ? { id: 1, role: 'ADMINISTRATOR' } : null));
  expect(await createClub(input, 1, prisma)).toEqual({ success: false, message: 'Owner account not found' });
  expect(db.club.create).not.toHaveBeenCalled();
});

test.each(['CLUB_OWNER', 'ADMINISTRATOR'])('preserves an existing owner role (%s)', async (role) => {
  db.account.findUnique.mockImplementation(({ where }) => Promise.resolve('id' in where ? { id: 1, role: 'ADMINISTRATOR' } : { id: 2, role }));
  expect((await createClub(input, 1, prisma)).success).toBe(true);
  expect(db.account.update).not.toHaveBeenCalled();
});

test('handles a duplicate inserted between lookup and creation', async () => {
  db.club.create.mockRejectedValue({ code: 'P2002' });
  expect(await createClub(input, 1, prisma)).toEqual({ success: false, message: 'Club name already exists' });
});

test('propagates database failures so CI cannot report false success', async () => {
  db.club.create.mockRejectedValue(new Error('database unavailable'));
  await expect(createClub(input, 1, prisma)).rejects.toThrow('database unavailable');
});
