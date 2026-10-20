import type { PrismaClient } from '@prisma/client';

export type ListedClub = { id: number; name: string; category: string };
export type ListClubsResult =
  | { success: true; clubs: ListedClub[] }
  | { success: false; message: 'Login required'; clubs: [] };

/** Resolve actorId from the session; check that the account still exists. */
export async function listClubs(actorId: number | null, prisma: PrismaClient): Promise<ListClubsResult> {
  const account = actorId === null ? null : await prisma.account.findUnique({ where: { id: actorId } });
  if (!account) return { success: false, message: 'Login required', clubs: [] };
  const clubs = await prisma.club.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, category: true },
  });
  return { success: true, clubs };
}
