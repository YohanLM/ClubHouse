
import { PrismaClient } from '@prisma/client';

export type ViewClubPageInput = {
  actorId: number | null;
  clubName: string;
  today: string;
};

export type ViewClubPageResult =
  | {
      success: true;
      club: {
        name: string;
        category: string;
        description: string | null;
        owner: string;
        upcomingEvents: {
          title: string;
          date: string;
        }[];
      };
      message: string | null;
    }
  | {
      success: false;
      message: string;
    };

export async function viewClubPage(
  input: ViewClubPageInput,
  prisma: PrismaClient
): Promise<ViewClubPageResult> {
  if (input.actorId === null) {
    return { success: false, message: 'Login required' };
  }

  const account = await prisma.account.findUnique({
    where: { id: input.actorId },
  });

  if (!account) {
    return { success: false, message: 'Login required' };
  }

  const club = await prisma.club.findUnique({
    where: { name: input.clubName },
    include: {
      owner: {
        select: { email: true },
      },
      events: {
        where: {
          status: 'SCHEDULED',
          date: { gte: input.today },
        },
        orderBy: [
          { date: 'asc' },
          { startTime: 'asc' },
        ],
        select: {
          title: true,
          date: true,
        },
      },
    },
  });

  if (!club) {
    return { success: false, message: 'Club not found' };
  }

  if (club.status === 'INACTIVE') {
    return { success: false, message: 'Club is inactive' };
  }

  return {
    success: true,
    club: {
      name: club.name,
      category: club.category,
      description: club.description,
      owner: club.owner.email,
      upcomingEvents: club.events,
    },
    message:
      club.events.length === 0 ? 'No upcoming events' : null,
  };
}
