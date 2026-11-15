// Follow Club service for ID_011 (T056).
// Any logged-in account can follow an active club. Following a club twice
// keeps the single existing follow, and the result always carries the
// club's follower count so the app can show it.
import { PrismaClient } from '@prisma/client';

export const FOLLOW_CLUB_ERRORS = {
  loginRequired: 'Login required',
  clubNotFound: 'Club not found',
  clubInactive: 'Club is inactive',
} as const;

export type FollowClubError =
  (typeof FOLLOW_CLUB_ERRORS)[keyof typeof FOLLOW_CLUB_ERRORS];

export const FOLLOW_CLUB_MESSAGES = {
  followed: 'Club followed',
  alreadyFollowed: 'Club already followed',
} as const;

export type FollowClubMessage =
  (typeof FOLLOW_CLUB_MESSAGES)[keyof typeof FOLLOW_CLUB_MESSAGES];

export interface FollowClubInput {
  /** Id of the logged-in account, or null when nobody is logged in. */
  actorId: number | null;
  clubId: number;
}

export type FollowClubResult =
  | {
      success: true;
      message: FollowClubMessage;
      clubId: number;
      /** Number of accounts following the club after the request. */
      followerCount: number;
    }
  | {
      success: false;
      message: FollowClubError;
    };

function fail(message: FollowClubError): FollowClubResult {
  return { success: false, message };
}

/** Unique-constraint violation: the follow was created by a concurrent request. */
function isDuplicateFollow(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

export async function followClub(
  input: FollowClubInput,
  prisma: PrismaClient
): Promise<FollowClubResult> {

  // 1. The user must be logged in with an existing account
  if (input.actorId == null) return fail(FOLLOW_CLUB_ERRORS.loginRequired);

  const actor = await prisma.account.findUnique({
    where: { id: input.actorId },
  });

  if (!actor) return fail(FOLLOW_CLUB_ERRORS.loginRequired);

  // 2. Only existing, active clubs can be followed
  const club = await prisma.club.findUnique({
    where: { id: input.clubId },
  });

  if (!club) return fail(FOLLOW_CLUB_ERRORS.clubNotFound);
  if (club.status !== 'ACTIVE') return fail(FOLLOW_CLUB_ERRORS.clubInactive);

  // 3. One follow per account and club: following again changes nothing
  const key = { accountId: actor.id, clubId: club.id };

  const existing = await prisma.follow.findUnique({
    where: { accountId_clubId: key },
  });

  let message: FollowClubMessage = FOLLOW_CLUB_MESSAGES.alreadyFollowed;

  if (!existing) {
    try {
      await prisma.follow.create({ data: key });
      message = FOLLOW_CLUB_MESSAGES.followed;
    } catch (error: unknown) {
      // Two requests raced and the other one created the follow first
      if (!isDuplicateFollow(error)) throw error;
    }
  }

  // 4. Report the follower count after the change
  const followerCount = await prisma.follow.count({
    where: { clubId: club.id },
  });

  return { success: true, message, clubId: club.id, followerCount };
}
