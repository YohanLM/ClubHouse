
import { PrismaClient } from '@prisma/client';

export const CREATE_EVENT_ERRORS = {
  unauthorized: 'Unauthorized user',
  titleRequired: 'Title is required',
  categoryRequired: 'Category is required',
  dateInvalid: 'Invalid event date',
  datePast: 'Event date cannot be past',
  timeInvalid: 'Invalid event time',
  endBeforeStart: 'End time must be after start',
  locationRequired: 'Location is required',
  capacityInvalid: 'Capacity must be a positive integer',
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
}

export type CreateEventResult =
  | { success: true; message: 'Event created'; event: CreatedEvent }
  | { success: false; message: CreateEventError };

export type Clock = () => Date;

function fail(message: CreateEventError): CreateEventResult {
  return { success: false, message };
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const actual = new Date(Date.UTC(year, month - 1, day));

  return (
    actual.getUTCFullYear() === year &&
    actual.getUTCMonth() + 1 === month &&
    actual.getUTCDate() === day
  );
}

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function todayInMontreal(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const value = (type: string) =>
    parts.find(part => part.type === type)!.value;

  return `${value('year')}-${value('month')}-${value('day')}`;
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

  if (!title) return fail(CREATE_EVENT_ERRORS.titleRequired);
  if (!category) return fail(CREATE_EVENT_ERRORS.categoryRequired);

  if (!isValidDate(date)) {
    return fail(CREATE_EVENT_ERRORS.dateInvalid);
  }

  if (date < todayInMontreal(clock())) {
    return fail(CREATE_EVENT_ERRORS.datePast);
  }

  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    return fail(CREATE_EVENT_ERRORS.timeInvalid);
  }

  if (endTime <= startTime) {
    return fail(CREATE_EVENT_ERRORS.endBeforeStart);
  }

  if (!location) {
    return fail(CREATE_EVENT_ERRORS.locationRequired);
  }

  // Capacity is optional but must be a positive integer
  if (
    input.capacity != null &&
    (!Number.isSafeInteger(input.capacity) || input.capacity <= 0)
  ) {
    return fail(CREATE_EVENT_ERRORS.capacityInvalid);
  }

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
    },
  };
}
