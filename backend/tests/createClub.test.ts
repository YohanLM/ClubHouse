import { PrismaClient } from '@prisma/client';
import { createClub } from '../src/services/createClub';

// Simulate the Prisma database operations
const mockPrisma = {
  account: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  club: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
} as unknown as PrismaClient;

function account(id: number, email: string, role: 'USER' | 'CLUB_OWNER' | 'ADMINISTRATOR') {
  return {
    id,
    name: email.split('@')[0],
    email,
    passwordHash: 'hashed_password',
    role,
    faculty: null,
    studyYear: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date(),
  };
}

// Accounts from the ID_007 feature background
const admin = account(1, 'admin.clubhouse@mcgill.ca', 'ADMINISTRATOR');
const dana = account(2, 'dana.lee@mail.mcgill.ca', 'CLUB_OWNER');
const evan = account(3, 'evan.roy@mail.mcgill.ca', 'USER');

const jazzSociety = {
  id: 10,
  name: 'Jazz Society',
  category: 'Arts',
  status: 'ACTIVE' as const,
  ownerId: evan.id,
  createdAt: new Date(),
};

const validInput = {
  actorId: admin.id,
  name: 'Jazz Society',
  category: 'Arts',
  ownerEmail: 'evan.roy@mail.mcgill.ca',
};

describe('createClub', () => {

  beforeEach(() => {
    jest.resetAllMocks();

    // The Robotics Club already exists
    jest.mocked(mockPrisma.club.findMany)
      .mockResolvedValue([{ name: 'Robotics Club' }] as never);

    // Resolve the transaction's queries in order
    jest.mocked(mockPrisma.$transaction)
      .mockImplementation((async (queries: Promise<unknown>[]) => Promise.all(queries)) as never);
  });

  test('should create a club and promote a regular user to Club Owner', async () => {

    // Arrange: actor is the administrator, owner is a regular user
    jest.mocked(mockPrisma.account.findUnique)
      .mockResolvedValueOnce(admin)
      .mockResolvedValueOnce(evan);
    jest.mocked(mockPrisma.club.create).mockResolvedValue(jazzSociety as never);
    jest.mocked(mockPrisma.account.update)
      .mockResolvedValue({ ...evan, role: 'CLUB_OWNER' } as never);

    // Act
    const result = await createClub(validInput, mockPrisma);

    // Assert
    expect(result).toEqual({
      success: true,
      message: 'Club created',
      club: {
        id: 10,
        name: 'Jazz Society',
        category: 'Arts',
        status: 'ACTIVE',
        ownerId: evan.id,
      },
    });

    expect(mockPrisma.club.create).toHaveBeenCalledWith({
      data: {
        name: 'Jazz Society',
        category: 'Arts',
        status: 'ACTIVE',
        ownerId: evan.id,
      },
    });

    // Club creation and promotion happen in one transaction
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.account.update).toHaveBeenCalledWith({
      where: { id: evan.id },
      data: { role: 'CLUB_OWNER' },
    });
  });

  test('should trim the club name and category before saving', async () => {

    jest.mocked(mockPrisma.account.findUnique)
      .mockResolvedValueOnce(admin)
      .mockResolvedValueOnce(evan);
    jest.mocked(mockPrisma.club.create).mockResolvedValue(jazzSociety as never);

    await createClub(
      { ...validInput, name: '  Jazz Society ', category: ' Arts  ' },
      mockPrisma
    );

    expect(mockPrisma.club.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'Jazz Society', category: 'Arts' }),
    });
  });

  test('should let an existing club owner own another club', async () => {

    jest.mocked(mockPrisma.account.findUnique)
      .mockResolvedValueOnce(admin)
      .mockResolvedValueOnce(dana);
    jest.mocked(mockPrisma.club.create)
      .mockResolvedValue({ ...jazzSociety, ownerId: dana.id } as never);

    const result = await createClub(
      { ...validInput, ownerEmail: 'dana.lee@mail.mcgill.ca' },
      mockPrisma
    );

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.club.ownerId).toBe(dana.id);
    }

    // Already a Club Owner: no role change
    expect(mockPrisma.account.update).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  test('should not demote an administrator assigned as owner', async () => {

    jest.mocked(mockPrisma.account.findUnique)
      .mockResolvedValueOnce(admin)
      .mockResolvedValueOnce(admin);
    jest.mocked(mockPrisma.club.create)
      .mockResolvedValue({ ...jazzSociety, ownerId: admin.id } as never);

    const result = await createClub(
      { ...validInput, ownerEmail: 'admin.clubhouse@mcgill.ca' },
      mockPrisma
    );

    expect(result.success).toBe(true);
    expect(mockPrisma.account.update).not.toHaveBeenCalled();
  });

  test.each([
    { description: 'a club owner', actor: dana },
    { description: 'a regular user', actor: evan },
  ])('should reject $description creating a club', async ({ actor }) => {

    jest.mocked(mockPrisma.account.findUnique).mockResolvedValueOnce(actor);

    const result = await createClub({ ...validInput, actorId: actor.id }, mockPrisma);

    expect(result).toEqual({ success: false, message: 'Unauthorized user' });
    expect(mockPrisma.club.create).not.toHaveBeenCalled();
  });

  test('should reject a request when nobody is logged in', async () => {

    const result = await createClub({ ...validInput, actorId: null }, mockPrisma);

    expect(result).toEqual({ success: false, message: 'Unauthorized user' });
    expect(mockPrisma.account.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.club.create).not.toHaveBeenCalled();
  });

  test('should reject an actor account that does not exist', async () => {

    jest.mocked(mockPrisma.account.findUnique).mockResolvedValueOnce(null);

    const result = await createClub({ ...validInput, actorId: 999 }, mockPrisma);

    expect(result).toEqual({ success: false, message: 'Unauthorized user' });
    expect(mockPrisma.club.create).not.toHaveBeenCalled();
  });

  test('should check the role before validating the club details', async () => {

    jest.mocked(mockPrisma.account.findUnique).mockResolvedValueOnce(evan);

    const result = await createClub(
      { ...validInput, actorId: evan.id, name: '' },
      mockPrisma
    );

    expect(result).toEqual({ success: false, message: 'Unauthorized user' });
  });

  test.each([
    {
      description: 'an empty club name',
      name: '',
      category: 'Arts',
      expectedError: 'Club name is required',
    },
    {
      description: 'a blank club name',
      name: '   ',
      category: 'Arts',
      expectedError: 'Club name is required',
    },
    {
      description: 'a missing club name',
      name: null,
      category: 'Arts',
      expectedError: 'Club name is required',
    },
    {
      description: 'an empty category',
      name: 'Jazz Society',
      category: '',
      expectedError: 'Category is required',
    },
    {
      description: 'a blank category',
      name: 'Jazz Society',
      category: '  ',
      expectedError: 'Category is required',
    },
  ])('should reject $description', async ({ name, category, expectedError }) => {

    jest.mocked(mockPrisma.account.findUnique).mockResolvedValueOnce(admin);

    const result = await createClub({ ...validInput, name, category }, mockPrisma);

    expect(result).toEqual({ success: false, message: expectedError });

    // Invalid details must never reach the club table
    expect(mockPrisma.club.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.club.create).not.toHaveBeenCalled();
  });

  test.each([
    { description: 'an existing club name', name: 'Robotics Club' },
    { description: 'an existing club name in different case', name: '  robotics CLUB ' },
  ])('should reject $description', async ({ name }) => {

    jest.mocked(mockPrisma.account.findUnique).mockResolvedValueOnce(admin);

    const result = await createClub({ ...validInput, name }, mockPrisma);

    expect(result).toEqual({ success: false, message: 'Club name already exists' });
    expect(mockPrisma.club.create).not.toHaveBeenCalled();
  });

  test.each([
    { description: 'an owner email with no account', ownerEmail: 'unknown.user@mail.mcgill.ca' },
    { description: 'an empty owner email', ownerEmail: '' },
  ])('should reject $description', async ({ ownerEmail }) => {

    jest.mocked(mockPrisma.account.findUnique)
      .mockResolvedValueOnce(admin)
      .mockResolvedValueOnce(null);

    const result = await createClub({ ...validInput, ownerEmail }, mockPrisma);

    expect(result).toEqual({ success: false, message: 'Owner account not found' });
    expect(mockPrisma.club.create).not.toHaveBeenCalled();
    expect(mockPrisma.account.update).not.toHaveBeenCalled();
  });

  test('should normalize the owner email before looking it up', async () => {

    jest.mocked(mockPrisma.account.findUnique)
      .mockResolvedValueOnce(admin)
      .mockResolvedValueOnce(evan);
    jest.mocked(mockPrisma.club.create).mockResolvedValue(jazzSociety as never);

    await createClub(
      { ...validInput, ownerEmail: '  Evan.Roy@MAIL.MCGILL.CA ' },
      mockPrisma
    );

    expect(mockPrisma.account.findUnique).toHaveBeenLastCalledWith({
      where: { email: 'evan.roy@mail.mcgill.ca' },
    });
  });

  test('should handle Prisma P2002 duplicate club name error', async () => {

    // Arrange: name appears available, but a concurrent request takes it
    jest.mocked(mockPrisma.account.findUnique)
      .mockResolvedValueOnce(admin)
      .mockResolvedValueOnce(dana);
    jest.mocked(mockPrisma.club.create).mockRejectedValue({
      code: 'P2002',
      message: 'Unique constraint failed on the fields: (name)',
    });

    const result = await createClub(validInput, mockPrisma);

    expect(result).toEqual({ success: false, message: 'Club name already exists' });
  });

  test('should rethrow unexpected database errors', async () => {

    jest.mocked(mockPrisma.account.findUnique)
      .mockResolvedValueOnce(admin)
      .mockResolvedValueOnce(evan);
    jest.mocked(mockPrisma.club.create).mockRejectedValue(new Error('Database offline'));

    await expect(createClub(validInput, mockPrisma)).rejects.toThrow('Database offline');
  });

});
