import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { createAccount } from '../src/services/createAccount';

// Simulate the Prisma database operations
const mockPrisma = {
  account: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
} as unknown as PrismaClient;

describe('createAccount', () => {

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should create an account with valid information', async () => {

    // Arrange: simulate an email that does not exist
    jest.spyOn(mockPrisma.account, 'findUnique')
      .mockResolvedValue(null);

    // Simulate successful account creation
    jest.spyOn(mockPrisma.account, 'create')
      .mockResolvedValue({
        id: 1,
        name: 'Alexandre Test',
        email: 'alexandre.test@mail.mcgill.ca',
        passwordHash: 'hashed_password',
        role: 'USER',
        faculty: 'Engineering',
        studyYear: 'U2',
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: new Date(),
      });

    // Act: call our service
    const result = await createAccount(
      {
        name: 'Alexandre Test',
        email: 'alexandre.test@mail.mcgill.ca',
        password: 'TestPassword123!',
        faculty: 'Engineering',
        studyYear: 'U2',
      },
      mockPrisma
    );

    // Assert: check the result
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.message).toBe('Account created');
      expect(result.account.email).toBe('alexandre.test@mail.mcgill.ca');
      expect(result.account.role).toBe('USER');
      expect(result.account.faculty).toBe('Engineering');
      expect(result.account.studyYear).toBe('U2');
    }
  });
  test('should reject an already registered email', async () => {

  // Arrange: simulate an account that already exists
  jest.spyOn(mockPrisma.account, 'findUnique')
    .mockResolvedValue({
      id: 1,
      name: 'Existing User',
      email: 'alexandre.test@mail.mcgill.ca',
      passwordHash: 'hashed_password',
      role: 'USER',
      faculty: null,
      studyYear: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
    });

  // Act: try to register with the same email
  const result = await createAccount(
    {
      name: 'Alexandre Test',
      email: 'alexandre.test@mail.mcgill.ca',
      password: 'TestPassword123!',
    },
    mockPrisma
  );

  // Assert: registration must fail
  expect(result.success).toBe(false);

  if (!result.success) {
    expect(result.message).toBe('Email already registered');
  }

  // A duplicate account must not be created
  expect(mockPrisma.account.create).not.toHaveBeenCalled();
});

test.each([
  {
    description: 'an email outside McGill',
    name: 'Alexandre Test',
    email: 'alexandre@gmail.com',
    password: 'TestPassword123!',
    expectedError: 'Invalid McGill email',
  },
  {
    description: 'a weak password',
    name: 'Alexandre Test',
    email: 'alexandre@mail.mcgill.ca',
    password: 'abc',
    expectedError: 'Password too weak',
  },
  {
    description: 'an empty name',
    name: '',
    email: 'alexandre@mail.mcgill.ca',
    password: 'TestPassword123!',
    expectedError: 'Name is required',
  },
  {
    description: 'an empty email',
    name: 'Alexandre Test',
    email: '',
    password: 'TestPassword123!',
    expectedError: 'Email is required',
  },
  {
    description: 'an empty password',
    name: 'Alexandre Test',
    email: 'alexandre@mail.mcgill.ca',
    password: '',
    expectedError: 'Password is required',
  },
])('should reject $description', async ({
  name,
  email,
  password,
  expectedError,
}) => {

  const result = await createAccount(
    { name, email, password },
    mockPrisma
  );

  expect(result.success).toBe(false);

  if (!result.success) {
    expect(result.message).toBe(expectedError);
  }

  // Invalid information must never reach the database
  expect(mockPrisma.account.findUnique).not.toHaveBeenCalled();
  expect(mockPrisma.account.create).not.toHaveBeenCalled();
});

test('should hash the password before saving the account', async () => {

  // Arrange: email is not registered yet
  jest.spyOn(mockPrisma.account, 'findUnique')
    .mockResolvedValue(null);

  // Simulate account creation
  jest.spyOn(mockPrisma.account, 'create')
    .mockResolvedValue({
      id: 1,
      name: 'Alexandre Test',
      email: 'alexandre.test@mail.mcgill.ca',
      passwordHash: 'mock_hash',
      role: 'USER',
      faculty: null,
      studyYear: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
    });

  const password = 'TestPassword123!';

  // Act
  await createAccount(
    {
      name: 'Alexandre Test',
      email: 'alexandre.test@mail.mcgill.ca',
      password,
    },
    mockPrisma
  );

  // Assert: check the data sent to Prisma
  expect(mockPrisma.account.create).toHaveBeenCalledTimes(1);

  const createCall = jest.mocked(mockPrisma.account.create)
    .mock.calls[0][0];

  const savedHash = createCall.data.passwordHash;

  // Password must not be stored as plain text
  expect(savedHash).not.toBe(password);

  // The stored hash must match the original password
  expect(await bcrypt.compare(password, savedHash)).toBe(true);
});

test('should normalize the email before checking duplicates', async () => {

  // Simulate an account that already exists
  jest.spyOn(mockPrisma.account, 'findUnique')
    .mockResolvedValue({
      id: 1,
      name: 'Existing User',
      email: 'alexandre.test@mail.mcgill.ca',
      passwordHash: 'hashed_password',
      role: 'USER',
      faculty: null,
      studyYear: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
    });

  // Attempt registration with uppercase letters and spaces
  const result = await createAccount(
    {
      name: 'Alexandre Test',
      email: '  Alexandre.Test@MAIL.MCGILL.CA  ',
      password: 'TestPassword123!',
    },
    mockPrisma
  );

  // The database must be searched with the normalized email
  expect(mockPrisma.account.findUnique).toHaveBeenCalledWith({
    where: {
      email: 'alexandre.test@mail.mcgill.ca',
    },
  });

  expect(result.success).toBe(false);
  expect(mockPrisma.account.create).not.toHaveBeenCalled();
});

test('should accept an email ending with @mcgill.ca', async () => {

  // Arrange: no account exists with this email
  jest.spyOn(mockPrisma.account, 'findUnique')
    .mockResolvedValue(null);

  jest.spyOn(mockPrisma.account, 'create')
    .mockResolvedValue({
      id: 2,
      name: 'McGill Student',
      email: 'student@mcgill.ca',
      passwordHash: 'hashed_password',
      role: 'USER',
      faculty: null,
      studyYear: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
    });

  // Act
  const result = await createAccount(
    {
      name: 'McGill Student',
      email: 'student@mcgill.ca',
      password: 'TestPassword123!',
    },
    mockPrisma
  );

  // Assert
  expect(result.success).toBe(true);

  expect(mockPrisma.account.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      email: 'student@mcgill.ca',
      role: 'USER',
    }),
  });

  if (result.success) {
    expect(result.account.email).toBe('student@mcgill.ca');
  }
});

test('should handle Prisma P2002 duplicate email error', async () => {

  // Arrange: email appears available initially
  jest.spyOn(mockPrisma.account, 'findUnique')
    .mockResolvedValue(null);

  // Simulate Prisma rejecting the insertion due to a duplicate email
  jest.spyOn(mockPrisma.account, 'create')
    .mockRejectedValue({
      code: 'P2002',
      message: 'Unique constraint failed on the fields: (email)',
    });

  // Act
  const result = await createAccount(
    {
      name: 'Alexandre Test',
      email: 'alexandre.test@mail.mcgill.ca',
      password: 'TestPassword123!',
    },
    mockPrisma
  );

  // Assert
  expect(result).toEqual({
    success: false,
    message: 'Email already registered',
  });

  expect(mockPrisma.account.create).toHaveBeenCalledTimes(1);
});

test('should never expose the password hash in the response', async () => {

  // Arrange
  jest.spyOn(mockPrisma.account, 'findUnique')
    .mockResolvedValue(null);

  jest.spyOn(mockPrisma.account, 'create')
    .mockResolvedValue({
      id: 1,
      name: 'Alexandre Test',
      email: 'alexandre.test@mail.mcgill.ca',
      passwordHash: 'secret_hashed_password',
      role: 'USER',
      faculty: null,
      studyYear: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
    });

  // Act
  const result = await createAccount(
    {
      name: 'Alexandre Test',
      email: 'alexandre.test@mail.mcgill.ca',
      password: 'TestPassword123!',
    },
    mockPrisma
  );

  // Assert
  expect(result.success).toBe(true);

  if (result.success) {
    expect(result.account).not.toHaveProperty('passwordHash');
    expect(result.account).not.toHaveProperty('password');
  }
});

});

