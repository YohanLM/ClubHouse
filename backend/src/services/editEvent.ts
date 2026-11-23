// Edit Event service (ID_016, T062).
// Only the owner of the event's club can edit it, and only while the event is
// SCHEDULED. Fields left undefined are unchanged; capacity null removes the limit.
import { PrismaClient } from '@prisma/client';
import { EVENT_VALIDATION_ERRORS, validateEvent, type Clock } from './eventValidation';

export const EDIT_EVENT_ERRORS = {
  unauthorized: 'Unauthorized user',
  eventNotFound: 'Event not found',
  cancelled: 'Cancelled events cannot be edited',
  completed: 'Completed events cannot be edited',
  ...EVENT_VALIDATION_ERRORS,
} as const;

export type EditEventError =
  (typeof EDIT_EVENT_ERRORS)[keyof typeof EDIT_EVENT_ERRORS];

export interface EditEventInput {
  /** Id of the logged-in account, or null when nobody is logged in. */
  actorId: number | null;
  eventId: number;
  title?: string | null;
  category?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  /** undefined = unchanged, null = remove the capacity limit */
  capacity?: number | null;
}

export interface EditedEvent {
  id: number;
  clubId: number;
  title: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number | null;
  status: string;
  attendeeCount: number;
}

export type EditEventResult =
  | { success: true; message: 'Event updated'; event: EditedEvent }
  | { success: false; message: EditEventError };

function fail(message: EditEventError): EditEventResult {
  return { success: false, message };
}

export async function editEvent(
  input: EditEventInput,
  prisma: PrismaClient,
  clock: Clock = () => new Date()
): Promise<EditEventResult> {
  // 1. The actor must be logged in
  if (input.actorId == null) return fail(EDIT_EVENT_ERRORS.unauthorized);

  // 2. The event must exist
  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    include: { club: true },
  });

  if (!event) return fail(EDIT_EVENT_ERRORS.eventNotFound);

  // 3. The actor must own the event's club and be a Club Owner
  if (event.club.ownerId !== input.actorId) {
    return fail(EDIT_EVENT_ERRORS.unauthorized);
  }

  const actor = await prisma.account.findUnique({ where: { id: input.actorId } });

  if (!actor || actor.role !== 'CLUB_OWNER') {
    return fail(EDIT_EVENT_ERRORS.unauthorized);
  }

  // 4. Only scheduled events can be edited
  if (event.status === 'CANCELLED') return fail(EDIT_EVENT_ERRORS.cancelled);
  if (event.status === 'COMPLETED') return fail(EDIT_EVENT_ERRORS.completed);

  // 5. Merge the changes into the current values, then validate the result
  const pick = (value: string | null | undefined, current: string) =>
    value === undefined ? current : (value ?? '').trim();

  const title = pick(input.title, event.title);
  const category = pick(input.category, event.category);
  const date = pick(input.date, event.date);
  const startTime = pick(input.startTime, event.startTime);
  const endTime = pick(input.endTime, event.endTime);
  const location = pick(input.location, event.location);
  const capacity = input.capacity === undefined ? event.capacity : input.capacity;

  const validationError = validateEvent(
    { title, category, date, startTime, endTime, location, capacity },
    clock,
    event.date,
  );
  if (validationError) return fail(validationError);

  // 6. Save, guarding on the status so a concurrent cancel is not overwritten
  const { count } = await prisma.event.updateMany({
    where: { id: event.id, status: 'SCHEDULED' },
    data: { title, category, date, startTime, endTime, location, capacity },
  });

  if (count === 0) {
    const current = await prisma.event.findUnique({ where: { id: event.id } });
    return fail(
      current?.status === 'COMPLETED'
        ? EDIT_EVENT_ERRORS.completed
        : EDIT_EVENT_ERRORS.cancelled
    );
  }

  const attendeeCount = await prisma.rSVP.count({
    where: { eventId: event.id, response: 'ATTENDING' },
  });

  return {
    success: true,
    message: 'Event updated',
    event: {
      id: event.id,
      clubId: event.clubId,
      title,
      category,
      date,
      startTime,
      endTime,
      location,
      capacity,
      status: 'SCHEDULED',
      attendeeCount,
    },
  };
}
