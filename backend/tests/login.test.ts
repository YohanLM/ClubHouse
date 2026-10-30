import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';
import {
  login,
  LOCKOUT_DURATION_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
} from '../src/services/login';

// Simulate the Prisma database operations
const mockPrisma = {
  account: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaClient;

const PASSWORD = 'Passw0rd!23';
const NOW = new Date('2026-10-25T12:00:00Z');

// Hashed once, with a low cost to keep the tests fast
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await bcrypt.hash(PASSWORD, 4);
});

function makeAccount(overrides: Partial<{
  role: Role;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}> = {}) {
  return {
    id: 1,
    name: 'Alice Tremblay',
    email: 'alice.tremblay@mail.mcgill.ca',
    passwordHash,
    role: 'USER' as Role,
    faculty: null,
    studyYear: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('login', () => {

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test.each<Role>(['USER', 'CLUB_OWNER', 'ADMINISTRATOR'])(
    'should log in a %s with valid credentials',
    async (role) => {

      // Arrange
      jest.spyOn(mockPrisma.account, 'findUnique')
        .mockResolvedValue(makeAccount({ role }));

      // Act
      const result = await login(
        { email: 'alice.tremblay@mail.mcgill.ca', password: PASSWORD },
        mockPrisma,
        NOW
      );

      // Assert: the session carries the account's role
      expect(result).toEqual({
        success: true,
        message: 'Login successful',
        session: {
          accountId: 1,
          name: 'Alice Tremblay',
          email: 'alice.tremblay@mail.mcgill.ca',
          role,
        },
      });

      // Nothing to reset, so no write
      expect(mockPrisma.account.update).not.toHaveBeenCalled();
    }
  );

  test('should match the email case-insensitively', async () => {

    jest.spyOn(mockPrisma.account, 'findUnique')
      .mockResolvedValue(makeAccount());

    const result = await login(
      { email: '  ALICE.Tremblay@mail.mcgill.ca ', password: PASSWORD },
      mockPrisma,
      NOW
    );

    // The database must be searched with the normalized email
    expect(mockPrisma.account.findUnique).toHaveBeenCalledWith({
      where: { email: 'alice.tremblay@mail.mcgill.ca' },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.session.email).toBe('alice.tremblay@mail.mcgill.ca');
    }
  });

  test('should never expose the password hash in the session', async () => {

    jest.spyOn(mockPrisma.account, 'findUnique')
      .mockResolvedValue(makeAccount());

    const result = await login(
      { email: 'alice.tremblay@mail.mcgill.ca', password: PASSWORD },
      mockPrisma,
      NOW
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.session).not.toHaveProperty('passwordHash');
      expect(result.session).not.toHaveProperty('password');
    }
  });

  test.each([
    { description: 'an empty email', email: '', password: PASSWORD, expectedError: 'Email is required' },
    { description: 'a blank email', email: '   ', password: PASSWORD, expectedError: 'Email is required' },
    { description: 'an empty password', email: 'alice.tremblay@mail.mcgill.ca', password: '', expectedError: 'Password is required' },
  ])('should reject $description', async ({ email, password, expectedError }) => {

    const result = await login({ email, password }, mockPrisma, NOW);

    expect(result).toEqual({ success: false, message: expectedError });

    // Missing fields must never reach the database
    expect(mockPrisma.account.findUnique).not.toHaveBeenCalled();
  });

  test('should reject an unknown email', async () => {

    jest.spyOn(mockPrisma.account, 'findUnique')
      .mockResolvedValue(null);

    const result = await login(
      { email: 'unknown.user@mail.mcgill.ca', password: PASSWORD },
      mockPrisma,
      NOW
    );

    expect(result).toEqual({ success: false, message: 'Invalid email or password' });
    expect(mockPrisma.account.update).not.toHaveBeenCalled();
  });

  test('should reject a wrong password and count the failed attempt', async () => {

    jest.spyOn(mockPrisma.account, 'findUnique')
      .mockResolvedValue(makeAccount({ failedLoginAttempts: 2 }));

    const result = await login(
      { email: 'alice.tremblay@mail.mcgill.ca', password: 'WrongPass1!' },
      mockPrisma,
      NOW
    );

    expect(result).toEqual({ success: false, message: 'Invalid email or password' });
    expect(mockPrisma.account.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { failedLoginAttempts: 3, lockedUntil: null },
    });
  });

  test('should lock the account on the fifth consecutive failed attempt', async () => {

    jest.spyOn(mockPrisma.account, 'findUnique')
      .mockResolvedValue(makeAccount({ failedLoginAttempts: MAX_FAILED_LOGIN_ATTEMPTS - 1 }));

    const result = await login(
      { email: 'alice.tremblay@mail.mcgill.ca', password: 'WrongPass1!' },
      mockPrisma,
      NOW
    );

    expect(result).toEqual({ success: false, message: 'Account temporarily locked' });
    expect(mockPrisma.account.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        failedLoginAttempts: MAX_FAILED_LOGIN_ATTEMPTS,
        lockedUntil: new Date(NOW.getTime() + LOCKOUT_DURATION_MS),
      },
    });
  });

  test('should refuse a locked account even with the correct password', async () => {

    jest.spyOn(mockPrisma.account, 'findUnique')
      .mockResolvedValue(makeAccount({
        failedLoginAttempts: MAX_FAILED_LOGIN_ATTEMPTS,
        lockedUntil: new Date(NOW.getTime() + 60_000),
      }));

    const result = await login(
      { email: 'alice.tremblay@mail.mcgill.ca', password: PASSWORD },
      mockPrisma,
      NOW
    );

    expect(result).toEqual({ success: false, message: 'Account temporarily locked' });
    expect(mockPrisma.account.update).not.toHaveBeenCalled();
  });

  test('should allow login once the lock has expired and reset the counter', async () => {

    jest.spyOn(mockPrisma.account, 'findUnique')
      .mockResolvedValue(makeAccount({
        failedLoginAttempts: MAX_FAILED_LOGIN_ATTEMPTS,
        lockedUntil: new Date(NOW.getTime() - 1),
      }));

    const result = await login(
      { email: 'alice.tremblay@mail.mcgill.ca', password: PASSWORD },
      mockPrisma,
      NOW
    );

    expect(result.success).toBe(true);
    expect(mockPrisma.account.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  });

  test('should start a fresh count after an expired lock', async () => {

    jest.spyOn(mockPrisma.account, 'findUnique')
      .mockResolvedValue(makeAccount({
        failedLoginAttempts: MAX_FAILED_LOGIN_ATTEMPTS,
        lockedUntil: new Date(NOW.getTime() - 1),
      }));

    const result = await login(
      { email: 'alice.tremblay@mail.mcgill.ca', password: 'WrongPass1!' },
      mockPrisma,
      NOW
    );

    expect(result).toEqual({ success: false, message: 'Invalid email or password' });
    expect(mockPrisma.account.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { failedLoginAttempts: 1, lockedUntil: null },
    });
  });

  test('should reset the failed attempt counter after a successful login', async () => {

    jest.spyOn(mockPrisma.account, 'findUnique')
      .mockResolvedValue(makeAccount({ failedLoginAttempts: 3 }));

    const result = await login(
      { email: 'alice.tremblay@mail.mcgill.ca', password: PASSWORD },
      mockPrisma,
      NOW
    );

    expect(result.success).toBe(true);
    expect(mockPrisma.account.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  });

});
