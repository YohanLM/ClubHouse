import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';
import { login, LOGIN_LOCK_MS } from '../src/services/login';

const now = new Date('2026-10-20T12:00:00Z');
const account = { id: 1, email: 'alice@mcgill.ca', role: 'USER', passwordHash: '',
  failedLoginAttempts: 0, lockedUntil: null as Date | null };
const db = { account: { findUnique: jest.fn(), update: jest.fn() },
  $transaction: jest.fn() };
const prisma = db as unknown as PrismaClient;

beforeAll(async () => { account.passwordHash = await bcrypt.hash('Passw0rd!23', 4); });
beforeEach(() => {
  jest.clearAllMocks();
  db.$transaction.mockImplementation((action) => action(db));
  db.account.findUnique.mockResolvedValue({ ...account });
  db.account.update.mockResolvedValue({ ...account });
});

test.each([
  [{ email: '', password: 'Passw0rd!23' }, 'Email is required'],
  [{ email: '  ', password: '' }, 'Email is required'],
  [{ email: 'alice@mcgill.ca', password: '' }, 'Password is required'],
])('rejects missing credentials before database access: %j', async (input, message) => {
  expect(await login(input, prisma)).toEqual({ success: false, message });
  expect(db.$transaction).not.toHaveBeenCalled();
});

test.each(['USER', 'CLUB_OWNER', 'ADMINISTRATOR'])('logs in %s, normalizes email and exposes only session fields', async (role) => {
  db.account.findUnique.mockResolvedValue({ ...account, role, failedLoginAttempts: 3 });
  expect(await login({ email: ' ALICE@McGill.CA ', password: 'Passw0rd!23' }, prisma, () => now))
    .toEqual({ success: true, message: 'Login successful', user: { id: 1, email: account.email, role } });
  expect(db.account.findUnique).toHaveBeenCalledWith({ where: { email: account.email } });
  expect(db.account.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { failedLoginAttempts: 0, lockedUntil: null } });
});

test('uses the same error for unknown accounts and incorrect passwords', async () => {
  const input = { email: account.email, password: 'wrong' };
  expect(await login(input, prisma, () => now)).toEqual({ success: false, message: 'Invalid email or password' });
  expect(db.account.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { failedLoginAttempts: 1, lockedUntil: null } });
  db.account.findUnique.mockResolvedValue(null);
  expect(await login(input, prisma, () => now)).toEqual({ success: false, message: 'Invalid email or password' });
});

test('locks on the fifth failure for fifteen minutes', async () => {
  db.account.findUnique.mockResolvedValue({ ...account, failedLoginAttempts: 4 });
  expect(await login({ email: account.email, password: 'wrong' }, prisma, () => now))
    .toEqual({ success: false, message: 'Account temporarily locked' });
  expect(db.account.update).toHaveBeenCalledWith({ where: { id: 1 }, data: {
    failedLoginAttempts: 5, lockedUntil: new Date(now.getTime() + LOGIN_LOCK_MS),
  } });
});

test('a correct password does not bypass an active lock', async () => {
  db.account.findUnique.mockResolvedValue({ ...account, failedLoginAttempts: 5, lockedUntil: new Date(now.getTime() + 1) });
  expect(await login({ email: account.email, password: 'Passw0rd!23' }, prisma, () => now))
    .toEqual({ success: false, message: 'Account temporarily locked' });
  expect(db.account.update).not.toHaveBeenCalled();
});

test('allows login exactly when a lock expires', async () => {
  db.account.findUnique.mockResolvedValue({ ...account, failedLoginAttempts: 5, lockedUntil: now });
  expect((await login({ email: account.email, password: 'Passw0rd!23' }, prisma, () => now)).success).toBe(true);
});

test('starts a fresh failure count after an expired lock', async () => {
  db.account.findUnique.mockResolvedValue({ ...account, failedLoginAttempts: 5, lockedUntil: now });
  await login({ email: account.email, password: 'wrong' }, prisma, () => now);
  expect(db.account.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { failedLoginAttempts: 1, lockedUntil: null } });
});
