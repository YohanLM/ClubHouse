
import { PrismaClient } from '@prisma/client';
import { listClubs, type ListedClub } from './listClubs';

export type SearchClubsInput = {
  actorId: number | null;
  keyword?: string;
  category?: string;
};

export type SearchClubsResult =
  | { success: true; clubs: ListedClub[]; message?: string }
  | { success: false; message: string };

export async function searchClubs(
  input: SearchClubsInput,
  prisma: PrismaClient
): Promise<SearchClubsResult> {
  const result = await listClubs(
    { actorId: input.actorId },
    prisma
  );

  if (!result.success) {
    return { success: false, message: result.message };
  }

  const keyword = input.keyword?.trim();
  const category = input.category?.trim();

  if (input.keyword !== undefined && !keyword) {
    return { success: false, message: 'Search keyword is required' };
  }

  if (!keyword && !category) {
    return { success: false, message: 'Search keyword is required' };
  }

  const clubs = result.clubs.filter(club => {
    const matchesKeyword = !keyword ||
      club.name.toLowerCase().includes(keyword.toLowerCase());

    const matchesCategory = !category ||
      club.category.toLowerCase() === category.toLowerCase();

    return matchesKeyword && matchesCategory;
  });

  if (clubs.length === 0) {
    return { success: true, clubs: [], message: 'No clubs found' };
  }

  return { success: true, clubs };
}
