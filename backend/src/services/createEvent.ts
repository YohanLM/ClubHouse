
import { PrismaClient } from '@prisma/client';

import { EVENT_VALIDATION_ERRORS, validateEvent, type Clock } from './eventValidation';

// Preserve imports used by existing services and callers.
export { isValidDate, todayInMontreal, type Clock } from './eventValidation';

export const CREATE_EVENT_ERRORS = {
  unauthorized: 'Unauthorized user',
  ...EVENT_VALIDATION_ERRORS,
} as const;

export type CreateEventError =
  (typeof CREATE_EVENT_ERRORS)[keyof typeof CREATE_EVENT_ERRORS];

export interface CreateEventInput {
  actorId: number | null;
  clubId: number;
  title?: string | null;
  category?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  capacity?: number | null;
}

export interface CreatedEvent {
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

export type CreateEventResult =
  | { success: true; message: 'Event created'; event: CreatedEvent }
  | { success: false; message: CreateEventError };

function fail(message: CreateEventError): CreateEventResult {
  return { success: false, message };
}

export async function createEvent(
  input: CreateEventInput,
  prisma: PrismaClient,
  clock: Clock = () => new Date()
): Promise<CreateEventResult> {

  // Check that the user owns the club
  if (input.actorId == null) {
    return fail(CREATE_EVENT_ERRORS.unauthorized);
  }

  const club = await prisma.club.findUnique({
    where: { id: input.clubId },
  });

  if (!club || club.ownerId !== input.actorId) {
    return fail(CREATE_EVENT_ERRORS.unauthorized);
  }

  const actor = await prisma.account.findUnique({
    where: { id: input.actorId },
  });

  if (!actor || actor.role !== 'CLUB_OWNER') {
    return fail(CREATE_EVENT_ERRORS.unauthorized);
  }

  // Validate input fields
  const title = input.title?.trim() ?? '';
  const category = input.category?.trim() ?? '';
  const date = input.date?.trim() ?? '';
  const startTime = input.startTime?.trim() ?? '';
  const endTime = input.endTime?.trim() ?? '';
  const location = input.location?.trim() ?? '';

  const validationError = validateEvent(
    { title, category, date, startTime, endTime, location, capacity: input.capacity },
    clock,
  );
  if (validationError) return fail(validationError);

  // Save the event
  const event = await prisma.event.create({
    data: {
      clubId: club.id,
      title,
      category,
      date,
      startTime,
      endTime,
      location,
      capacity: input.capacity ?? null,
      status: 'SCHEDULED',
    },
  });

  return {
    success: true,
    message: 'Event created',
    event: {
      id: event.id,
      clubId: event.clubId,
      title: event.title,
      category: event.category,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      capacity: event.capacity,
      status: event.status,
      attendeeCount: 0,
    },
  };
}
