// Owned events service, for the Edit Event form (ID_016, T065).
// Lists the SCHEDULED events of the clubs the logged-in Club Owner owns, with
// every field the form shows, so the owner can pick one and edit it.
import { PrismaClient } from '@prisma/client';

export const LIST_OWNED_EVENTS_ERRORS = {
  loginRequired: 'Login required',
} as const;

export interface OwnedEvent {
  id: number;
  clubId: number;
  clubName: string;
  title: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number | null;
}

export type ListOwnedEventsResult =
  | { success: true; events: OwnedEvent[] }
  | { success: false; message: 'Login required' };

export async function listOwnedEvents(
  input: { actorId: number | null },
  prisma: PrismaClient
): Promise<ListOwnedEventsResult> {
  if (input.actorId == null) {
    return { success: false, message: LIST_OWNED_EVENTS_ERRORS.loginRequired };
  }

  const actor = await prisma.account.findUnique({ where: { id: input.actorId } });
  if (!actor) return { success: false, message: LIST_OWNED_EVENTS_ERRORS.loginRequired };

  // Only Club Owners can edit events; other users simply own no event
  if (actor.role !== 'CLUB_OWNER') return { success: true, events: [] };

  const events = await prisma.event.findMany({
    where: { status: 'SCHEDULED', club: { ownerId: actor.id } },
    include: { club: { select: { name: true } } },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { title: 'asc' }],
  });

  return {
    success: true,
    events: events.map(event => ({
      id: event.id,
      clubId: event.clubId,
      clubName: event.club.name,
      title: event.title,
      category: event.category,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      capacity: event.capacity,
    })),
  };
}
