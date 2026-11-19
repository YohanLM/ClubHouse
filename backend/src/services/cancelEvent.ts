// Cancel Event service.
// Only the owner of the event's club can cancel it, and only while the event
// is still SCHEDULED. The cancellation reason is optional (max 500 chars).
import { PrismaClient } from '@prisma/client';
import { EVENT_STATUS_ERRORS, validateStatusChange } from './eventStatus';

export const CANCEL_EVENT_ERRORS = {
  unauthorized: 'Unauthorized user',
  eventNotFound: 'Event not found',
  alreadyCancelled: 'Event is already cancelled',
  alreadyCompleted: 'Event has already taken place',
  reasonTooLong: EVENT_STATUS_ERRORS.reasonTooLong,
} as const;

export type CancelEventError =
  (typeof CANCEL_EVENT_ERRORS)[keyof typeof CANCEL_EVENT_ERRORS];

export interface CancelEventInput {
  /** Id of the logged-in account, or null when nobody is logged in. */
  actorId: number | null;
  eventId: number;
  reason?: string | null;
}

export interface CancelledEvent {
  id: number;
  clubId: number;
  title: string;
  status: string;
  cancellationReason: string | null;
}

export type CancelEventResult =
  | { success: true; message: 'Event cancelled'; event: CancelledEvent }
  | { success: false; message: CancelEventError };

function fail(message: CancelEventError): CancelEventResult {
  return { success: false, message };
}

export async function cancelEvent(
  input: CancelEventInput,
  prisma: PrismaClient
): Promise<CancelEventResult> {
  // 1. The actor must be logged in
  if (input.actorId == null) return fail(CANCEL_EVENT_ERRORS.unauthorized);

  // 2. The event must exist
  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    include: { club: true },
  });

  if (!event) return fail(CANCEL_EVENT_ERRORS.eventNotFound);

  // 3. The actor must own the event's club and be a Club Owner
  //    (same rule as createEvent; the role is read from the database)
  if (event.club.ownerId !== input.actorId) {
    return fail(CANCEL_EVENT_ERRORS.unauthorized);
  }

  const actor = await prisma.account.findUnique({
    where: { id: input.actorId },
  });

  if (!actor || actor.role !== 'CLUB_OWNER') {
    return fail(CANCEL_EVENT_ERRORS.unauthorized);
  }

  // 4. Only scheduled events can be cancelled; the reason must be valid
  if (event.status === 'CANCELLED') return fail(CANCEL_EVENT_ERRORS.alreadyCancelled);
  if (event.status === 'COMPLETED') return fail(CANCEL_EVENT_ERRORS.alreadyCompleted);

  const change = validateStatusChange(event.status, 'CANCELLED', input.reason);
  if (!change.ok) {
    // The transition is valid (checked above), so only the reason can fail.
    return fail(CANCEL_EVENT_ERRORS.reasonTooLong);
  }

  // 5. Cancel, guarding on the status so a concurrent change is not overwritten
  const { count } = await prisma.event.updateMany({
    where: { id: event.id, status: 'SCHEDULED' },
    data: { status: 'CANCELLED', cancellationReason: change.cancellationReason },
  });

  if (count === 0) {
    // Changed concurrently: report its current status.
    const current = await prisma.event.findUnique({ where: { id: event.id } });
    return fail(
      current?.status === 'COMPLETED'
        ? CANCEL_EVENT_ERRORS.alreadyCompleted
        : CANCEL_EVENT_ERRORS.alreadyCancelled
    );
  }

  return {
    success: true,
    message: 'Event cancelled',
    event: {
      id: event.id,
      clubId: event.clubId,
      title: event.title,
      status: 'CANCELLED',
      cancellationReason: change.cancellationReason,
    },
  };
}
