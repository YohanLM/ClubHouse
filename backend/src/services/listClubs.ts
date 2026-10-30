// List Clubs service for ID_008.
// Any logged-in account (User, Club Owner or Administrator) can browse the
// clubs. Inactive clubs are hidden and the list is in alphabetical order.
import { PrismaClient } from '@prisma/client';

export const LIST_CLUBS_ERRORS = {
  loginRequired: 'Login required',
} as const;

export type ListClubsError =
  (typeof LIST_CLUBS_ERRORS)[keyof typeof LIST_CLUBS_ERRORS];

export interface ListClubsInput {
  /** Id of the logged-in account, or null when nobody is logged in. */
  actorId: number | null;
}

export interface ListedClub {
  id: number;
  name: string;
  category: string;
}

export type ListClubsResult =
  | {
      success: true;
      clubs: ListedClub[];
    }
  | {
      success: false;
      message: ListClubsError;
    };

// List the active clubs using Prisma
export async function listClubs(
  input: ListClubsInput,
  prisma: PrismaClient
): Promise<ListClubsResult> {

  // 1. The user must be logged in with an existing account
  if (input.actorId == null) {
    return { success: false, message: LIST_CLUBS_ERRORS.loginRequired };
  }

  const actor = await prisma.account.findUnique({
    where: { id: input.actorId },
  });

  if (!actor) {
    return { success: false, message: LIST_CLUBS_ERRORS.loginRequired };
  }

  // 2. Only active clubs are listed, whatever the role of the user
  const clubs = await prisma.club.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, category: true },
  });

  // 3. Sort by name, ignoring case. SQLite's ORDER BY compares bytes, so
  //    "aikido Club" would come after "Zoology Society"; sort in code.
  clubs.sort((a, b) => a.name.localeCompare(b.name, 'en'));

  return { success: true, clubs };
}
