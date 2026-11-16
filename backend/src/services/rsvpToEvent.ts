import { PrismaClient } from '@prisma/client';
import { Clock, todayInMontreal } from './createEvent';

export const RSVP_TO_EVENT_ERRORS = {
  loginRequired: 'Login required',
  eventNotFound: 'Event not found',
  eventCancelled: 'Event is cancelled',
  alreadyTakenPlace: 'Event has already taken place',
  eventFull: 'Event is full',
  invalidResponse: 'Invalid RSVP response',
} as const;

export type RsvpToEventError =
  (typeof RSVP_TO_EVENT_ERRORS)[keyof typeof RSVP_TO_EVENT_ERRORS];

export type RsvpResponse = 'ATTENDING' | 'NOT_ATTENDING';

export interface RsvpToEventInput {
  /** Id of the logged-in account, or null when nobody is logged in. */
  actorId: number | null;
  eventId: number;
  response?: string | null;
}

export type RsvpToEventResult =
  | {
      success: true;
      message: 'RSVP saved';
      eventId: number;
      response: RsvpResponse;
      attendeeCount: number;
    }
  | { success: false; message: RsvpToEventError };

function fail(message: RsvpToEventError): RsvpToEventResult {
  return { success: false, message };
}

function normalizeResponse(value: string | null | undefined): RsvpResponse | null {
  const normalized = value?.trim().toUpperCase().replace(/\s+/g, '_');
  return normalized === 'ATTENDING' || normalized === 'NOT_ATTENDING'
    ? normalized
    : null;
}

export async function rsvpToEvent(
  input: RsvpToEventInput,
  prisma: PrismaClient,
  clock: Clock = () => new Date()
): Promise<RsvpToEventResult> {
  if (input.actorId == null) {
    return fail(RSVP_TO_EVENT_ERRORS.loginRequired);
  }

  const actor = await prisma.account.findUnique({
    where: { id: input.actorId },
    select: { id: true },
  });
  if (!actor) return fail(RSVP_TO_EVENT_ERRORS.loginRequired);

  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    select: { id: true, date: true, status: true, capacity: true },
  });
  if (!event) return fail(RSVP_TO_EVENT_ERRORS.eventNotFound);
  if (event.status === 'CANCELLED') {
    return fail(RSVP_TO_EVENT_ERRORS.eventCancelled);
  }
  if (event.status === 'COMPLETED' || event.date < todayInMontreal(clock())) {
    return fail(RSVP_TO_EVENT_ERRORS.alreadyTakenPlace);
  }

  const response = normalizeResponse(input.response);
  if (!response) return fail(RSVP_TO_EVENT_ERRORS.invalidResponse);

  const key = { accountId: actor.id, eventId: event.id };
  const existing = await prisma.rSVP.findUnique({
    where: { accountId_eventId: key },
  });
  const attendeeCount = await prisma.rSVP.count({
    where: { eventId: event.id, response: 'ATTENDING' },
  });

  if (
    response === 'ATTENDING' &&
    existing?.response !== 'ATTENDING' &&
    event.capacity !== null &&
    attendeeCount >= event.capacity
  ) {
    return fail(RSVP_TO_EVENT_ERRORS.eventFull);
  }

  await prisma.rSVP.upsert({
    where: { accountId_eventId: key },
    create: { ...key, response },
    update: { response },
  });

  const updatedAttendeeCount = await prisma.rSVP.count({
    where: { eventId: event.id, response: 'ATTENDING' },
  });

  return {
    success: true,
    message: 'RSVP saved',
    eventId: event.id,
    response,
    attendeeCount: updatedAttendeeCount,
  };
}
