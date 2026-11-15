// Followed clubs of the logged-in account, for ID_011 Follow Club (T059).
// The Clubs list screen uses it to show which clubs the user already follows.
import { PrismaClient } from '@prisma/client';
import { FOLLOW_CLUB_ERRORS } from './followClub';

export interface ListFollowedClubsInput {
  /** Id of the logged-in account, or null when nobody is logged in. */
  actorId: number | null;
}

export type ListFollowedClubsResult =
  | { success: true; clubIds: number[] }
  | { success: false; message: typeof FOLLOW_CLUB_ERRORS.loginRequired };

export async function listFollowedClubs(
  input: ListFollowedClubsInput,
  prisma: PrismaClient
): Promise<ListFollowedClubsResult> {

  // 1. The user must be logged in with an existing account
  const loginRequired = { success: false, message: FOLLOW_CLUB_ERRORS.loginRequired } as const;

  if (input.actorId == null) return loginRequired;

  const actor = await prisma.account.findUnique({
    where: { id: input.actorId },
  });

  if (!actor) return loginRequired;

  // 2. Ids of the clubs this account follows
  const follows = await prisma.follow.findMany({
    where: { accountId: actor.id },
    select: { clubId: true },
  });

  return { success: true, clubIds: follows.map((follow) => follow.clubId) };
}
