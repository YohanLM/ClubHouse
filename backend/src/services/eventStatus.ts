export type EventStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';

export const MAX_CANCELLATION_REASON_LENGTH = 500;

export const EVENT_STATUS_ERRORS = {
  invalidStatus: 'Invalid event status',
  invalidTransition: 'Invalid status change',
  reasonNotAllowed: 'Cancellation reason only applies to cancelled events',
  reasonTooLong: 'Cancellation reason is too long',
} as const;

export type EventStatusError =
  (typeof EVENT_STATUS_ERRORS)[keyof typeof EVENT_STATUS_ERRORS];

// Scheduled -> Cancelled | Completed. Cancelled and Completed are final.
const ALLOWED: Record<EventStatus, EventStatus[]> = {
  SCHEDULED: ['CANCELLED', 'COMPLETED'],
  CANCELLED: [],
  COMPLETED: [],
};

export type StatusChangeResult =
  | { ok: true; status: EventStatus; cancellationReason: string | null }
  | { ok: false; message: EventStatusError };

export function validateStatusChange(
  current: EventStatus,
  next: EventStatus,
  reason?: string | null
): StatusChangeResult {
  if (!(next in ALLOWED) || !(current in ALLOWED)) {
    return { ok: false, message: EVENT_STATUS_ERRORS.invalidStatus };
  }

  if (!ALLOWED[current].includes(next)) {
    return { ok: false, message: EVENT_STATUS_ERRORS.invalidTransition };
  }

  const trimmed = reason?.trim() ?? '';

  // The reason is optional when cancelling; a blank reason is stored as null.
  if (next === 'CANCELLED') {
    if (trimmed.length > MAX_CANCELLATION_REASON_LENGTH) {
      return { ok: false, message: EVENT_STATUS_ERRORS.reasonTooLong };
    }
    return { ok: true, status: next, cancellationReason: trimmed || null };
  }

  if (trimmed) {
    return { ok: false, message: EVENT_STATUS_ERRORS.reasonNotAllowed };
  }
  return { ok: true, status: next, cancellationReason: null };
}
