// Create Club service for ID_007.
// Only administrators can create clubs. The owner is an existing account,
// promoted to CLUB_OWNER when they are a regular USER.
import { PrismaClient } from '@prisma/client';
import { normalizeEmail } from './registrationValidation';

export const CREATE_CLUB_ERRORS = {
  unauthorized: 'Unauthorized user',
  nameRequired: 'Club name is required',
  categoryRequired: 'Category is required',
  nameTaken: 'Club name already exists',
  ownerNotFound: 'Owner account not found',
} as const;

export type CreateClubError =
  (typeof CREATE_CLUB_ERRORS)[keyof typeof CREATE_CLUB_ERRORS];

export interface CreateClubInput {
  /** Id of the logged-in account, or null when nobody is logged in. */
  actorId: number | null;
  name?: string | null;
  category?: string | null;
  /** Email of the account that will own the club. */
  ownerEmail?: string | null;
}

export interface CreatedClub {
  id: number;
  name: string;
  category: string;
  status: string;
  ownerId: number;
}

export type CreateClubResult =
  | {
      success: true;
      message: 'Club created';
      club: CreatedClub;
    }
  | {
      success: false;
      message: CreateClubError;
    };

function fail(message: CreateClubError): CreateClubResult {
  return { success: false, message };
}

// Create a club and assign its owner using Prisma
export async function createClub(
  input: CreateClubInput,
  prisma: PrismaClient
): Promise<CreateClubResult> {

  // 1. Only administrators can create clubs (role is read from the database)
  if (input.actorId == null) return fail(CREATE_CLUB_ERRORS.unauthorized);

  const actor = await prisma.account.findUnique({
    where: { id: input.actorId },
  });

  if (!actor || actor.role !== 'ADMINISTRATOR') {
    return fail(CREATE_CLUB_ERRORS.unauthorized);
  }

  // 2. Validate club details
  const name = input.name?.trim() ?? '';
  const category = input.category?.trim() ?? '';

  if (name === '') return fail(CREATE_CLUB_ERRORS.nameRequired);
  if (category === '') return fail(CREATE_CLUB_ERRORS.categoryRequired);

  // 3. Club names are unique, ignoring case (D6). SQLite has no
  //    case-insensitive mode in Prisma, so compare in code.
  const existingClubs = await prisma.club.findMany({
    select: { name: true },
  });

  if (existingClubs.some((club) => club.name.toLowerCase() === name.toLowerCase())) {
    return fail(CREATE_CLUB_ERRORS.nameTaken);
  }

  // 4. The owner must be an existing account
  const ownerEmail = input.ownerEmail?.trim() ?? '';
  const owner =
    ownerEmail === ''
      ? null
      : await prisma.account.findUnique({
          where: { email: normalizeEmail(ownerEmail) },
        });

  if (!owner) return fail(CREATE_CLUB_ERRORS.ownerNotFound);

  // 5. Create the club and promote a regular user to Club Owner atomically.
  //    Existing club owners and administrators keep their role.
  try {
    const createClubQuery = prisma.club.create({
      data: {
        name,
        category,
        status: 'ACTIVE',
        ownerId: owner.id,
      },
    });

    const club =
      owner.role === 'USER'
        ? (
            await prisma.$transaction([
              createClubQuery,
              prisma.account.update({
                where: { id: owner.id },
                data: { role: 'CLUB_OWNER' },
              }),
            ])
          )[0]
        : await createClubQuery;

    return {
      success: true,
      message: 'Club created',
      club: {
        id: club.id,
        name: club.name,
        category: club.category,
        status: club.status,
        ownerId: club.ownerId,
      },
    };

  } catch (error: unknown) {

    // Handle duplicate names caused by concurrent requests
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return fail(CREATE_CLUB_ERRORS.nameTaken);
    }

    throw error;
  }
}
