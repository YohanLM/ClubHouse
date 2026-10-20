import type { Event, PrismaClient } from '@prisma/client';

export interface CreateEventInput {
  clubName: string;
  title?: string | null;
  category?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  capacity?: number | null;
}

export type CreateEventResult =
  | { success: true; message: 'Event created'; event: Event }
  | { success: false; message: string };

function validDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

/** Dates are calendar dates in Montreal; the injectable clock keeps tests deterministic. */
export async function createEvent(
  input: CreateEventInput,
  actorId: number | null,
  prisma: PrismaClient,
  now: () => Date = () => new Date(),
): Promise<CreateEventResult> {
  return prisma.$transaction(async (tx) => {
    const club = await tx.club.findUnique({ where: { name: input.clubName.trim() } });
    if (actorId === null || !club || club.ownerId !== actorId) {
      return { success: false, message: 'Unauthorized user' };
    }
    const title = input.title?.trim();
    const category = input.category?.trim();
    const date = input.date?.trim() ?? '';
    const startTime = input.startTime?.trim() ?? '';
    const endTime = input.endTime?.trim() ?? '';
    const location = input.location?.trim();
    if (!title) return { success: false, message: 'Title is required' };
    if (!category) return { success: false, message: 'Category is required' };
    if (!validDate(date)) return { success: false, message: 'Invalid event date' };
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now());
    if (date < today) return { success: false, message: 'Event date cannot be past' };
    const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
      return { success: false, message: 'Invalid event time' };
    }
    if (endTime <= startTime) return { success: false, message: 'End time must be after start' };
    if (!location) return { success: false, message: 'Location is required' };
    if (input.capacity != null && (!Number.isSafeInteger(input.capacity) || input.capacity <= 0)) {
      return { success: false, message: 'Capacity must be a positive integer' };
    }
    const event = await tx.event.create({
      data: { clubId: club.id, title, category, date, startTime, endTime, location,
        capacity: input.capacity ?? null, status: 'SCHEDULED' },
    });
    return { success: true, message: 'Event created', event };
  });
}
