import type { Club, PrismaClient } from '@prisma/client';
import { normalizeEmail } from './registrationValidation';

export interface CreateClubInput {
  name?: string | null;
  category?: string | null;
  ownerEmail?: string | null;
}

export type CreateClubResult =
  | { success: true; message: 'Club created'; club: Club }
  | { success: false; message: string };

/** actorId must come from an authenticated session, not a submitted form. */
export async function createClub(
  input: CreateClubInput,
  actorId: number | null,
  prisma: PrismaClient,
): Promise<CreateClubResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const actor = actorId === null ? null : await tx.account.findUnique({ where: { id: actorId } });
      if (actor?.role !== 'ADMINISTRATOR') return { success: false, message: 'Unauthorized user' };
      const name = input.name?.trim();
      const category = input.category?.trim();
      if (!name) return { success: false, message: 'Club name is required' };
      if (!category) return { success: false, message: 'Category is required' };
      if (await tx.club.findUnique({ where: { name } })) {
        return { success: false, message: 'Club name already exists' };
      }
      const owner = await tx.account.findUnique({ where: { email: normalizeEmail(input.ownerEmail ?? '') } });
      if (!owner) return { success: false, message: 'Owner account not found' };
      const club = await tx.club.create({ data: { name, category, ownerId: owner.id, status: 'ACTIVE' } });
      // Club ownership must not demote an administrator.
      if (owner.role === 'USER') {
        await tx.account.update({ where: { id: owner.id }, data: { role: 'CLUB_OWNER' } });
      }
      return { success: true, message: 'Club created', club };
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return { success: false, message: 'Club name already exists' };
    }
    throw error;
  }
}
