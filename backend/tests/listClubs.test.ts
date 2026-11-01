import { PrismaClient } from '@prisma/client';
import { listClubs } from '../src/services/listClubs';

// Simulate the Prisma database operations
const mockPrisma = {
  account: {
    findUnique: jest.fn(),
  },
  club: {
    findMany: jest.fn(),
  },
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

// Accounts from the ID_008 feature scenarios
const alice = account(1, 'alice.tremblay@mail.mcgill.ca', 'USER');
const dana = account(2, 'dana.lee@mail.mcgill.ca', 'CLUB_OWNER');
const admin = account(3, 'admin.clubhouse@mcgill.ca', 'ADMINISTRATOR');

// Active clubs from the ID_008 feature background, in database order
// (Ski Club is inactive, so the database query does not return it)
const robotics = { id: 10, name: 'Robotics Club', category: 'Academic' };
const jazz = { id: 11, name: 'Jazz Society', category: 'Arts' };
const debate = { id: 13, name: 'Debate Union', category: 'Academic' };

describe('listClubs', () => {

  beforeEach(() => {
    jest.resetAllMocks();

    jest.mocked(mockPrisma.club.findMany)
      .mockResolvedValue([robotics, jazz, debate] as never);
  });

  test('should list the active clubs in alphabetical order for a logged-in user', async () => {

    // Arrange: a regular user is logged in
    jest.mocked(mockPrisma.account.findUnique).mockResolvedValue(alice);

    // Act
    const result = await listClubs({ actorId: alice.id }, mockPrisma);

    // Assert
    expect(result).toEqual({
      success: true,
      clubs: [
        { id: 13, name: 'Debate Union', category: 'Academic' },
        { id: 11, name: 'Jazz Society', category: 'Arts' },
        { id: 10, name: 'Robotics Club', category: 'Academic' },
      ],
    });

    expect(mockPrisma.account.findUnique).toHaveBeenCalledWith({
      where: { id: alice.id },
    });
  });

  test('should only query active clubs and only their id, name and category', async () => {

    jest.mocked(mockPrisma.account.findUnique).mockResolvedValue(alice);

    await listClubs({ actorId: alice.id }, mockPrisma);

    // Inactive clubs (e.g. Ski Club) are filtered out by the query
    expect(mockPrisma.club.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.club.findMany).toHaveBeenCalledWith({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, category: true },
    });
  });

  test.each([
    { description: 'a club owner', actor: dana },
    { description: 'an administrator', actor: admin },
  ])('should list the same active clubs for $description', async ({ actor }) => {

    jest.mocked(mockPrisma.account.findUnique).mockResolvedValue(actor);

    const result = await listClubs({ actorId: actor.id }, mockPrisma);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.clubs).toHaveLength(3);
      expect(result.clubs.map((club) => club.name)).not.toContain('Ski Club');
    }

    // The role does not change the query
    expect(mockPrisma.club.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'ACTIVE' } })
    );
  });

  test('should sort club names ignoring case', async () => {

    jest.mocked(mockPrisma.account.findUnique).mockResolvedValue(alice);
    jest.mocked(mockPrisma.club.findMany).mockResolvedValue([
      { id: 1, name: 'Zoology Society', category: 'Academic' },
      { id: 2, name: 'aikido Club', category: 'Sports' },
      { id: 3, name: 'Board Games', category: 'Social' },
    ] as never);

    const result = await listClubs({ actorId: alice.id }, mockPrisma);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.clubs.map((club) => club.name))
        .toEqual(['aikido Club', 'Board Games', 'Zoology Society']);
    }
  });

  test('should return an empty list when there are no active clubs', async () => {

    jest.mocked(mockPrisma.account.findUnique).mockResolvedValue(alice);
    jest.mocked(mockPrisma.club.findMany).mockResolvedValue([] as never);

    const result = await listClubs({ actorId: alice.id }, mockPrisma);

    expect(result).toEqual({ success: true, clubs: [] });
  });

  test('should reject a request when nobody is logged in', async () => {

    const result = await listClubs({ actorId: null }, mockPrisma);

    expect(result).toEqual({ success: false, message: 'Login required' });

    // No database access without a logged-in user
    expect(mockPrisma.account.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.club.findMany).not.toHaveBeenCalled();
  });

  test('should reject an actor account that does not exist', async () => {

    jest.mocked(mockPrisma.account.findUnique).mockResolvedValue(null);

    const result = await listClubs({ actorId: 999 }, mockPrisma);

    expect(result).toEqual({ success: false, message: 'Login required' });
    expect(mockPrisma.club.findMany).not.toHaveBeenCalled();
  });

  test('should accept an actor id of 0 as a logged-in id', async () => {

    // Only null means "nobody logged in"; 0 must still be looked up
    jest.mocked(mockPrisma.account.findUnique).mockResolvedValue({ ...alice, id: 0 });

    const result = await listClubs({ actorId: 0 }, mockPrisma);

    expect(result.success).toBe(true);
    expect(mockPrisma.account.findUnique).toHaveBeenCalledWith({ where: { id: 0 } });
  });

  test('should rethrow unexpected database errors', async () => {

    jest.mocked(mockPrisma.account.findUnique).mockResolvedValue(alice);
    jest.mocked(mockPrisma.club.findMany).mockRejectedValue(new Error('Database offline'));

    await expect(listClubs({ actorId: alice.id }, mockPrisma)).rejects.toThrow('Database offline');
  });

});
