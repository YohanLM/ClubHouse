export const EVENT_VALIDATION_ERRORS = {
  titleRequired: 'Title is required',
  categoryRequired: 'Category is required',
  dateInvalid: 'Invalid event date',
  datePast: 'Event date cannot be past',
  timeInvalid: 'Invalid event time',
  endBeforeStart: 'End time must be after start',
  locationRequired: 'Location is required',
  capacityInvalid: 'Capacity must be a positive integer',
} as const;

export type EventValidationError =
  (typeof EVENT_VALIDATION_ERRORS)[keyof typeof EVENT_VALIDATION_ERRORS];

export type Clock = () => Date;

// Services normalize supplied strings and merge edits before validation.
export interface EventFields {
  title: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity?: number | null;
}

export function isValidDate(value: string): boolean {
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

export function todayInMontreal(now: Date): string {
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

// An edit may keep its existing past date. Creation always checks against today.
export function validateEvent(
  fields: EventFields,
  clock: Clock = () => new Date(),
  previousDate?: string,
): EventValidationError | null {
  const { title, category, date, startTime, endTime, location, capacity } = fields;

  if (!title) return EVENT_VALIDATION_ERRORS.titleRequired;
  if (!category) return EVENT_VALIDATION_ERRORS.categoryRequired;

  if (!isValidDate(date)) {
    return EVENT_VALIDATION_ERRORS.dateInvalid;
  }

  if (date !== previousDate && date < todayInMontreal(clock())) {
    return EVENT_VALIDATION_ERRORS.datePast;
  }

  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    return EVENT_VALIDATION_ERRORS.timeInvalid;
  }

  if (endTime <= startTime) {
    return EVENT_VALIDATION_ERRORS.endBeforeStart;
  }

  if (!location) {
    return EVENT_VALIDATION_ERRORS.locationRequired;
  }

  // Capacity is optional but must be a positive integer
  if (
    capacity != null &&
    (!Number.isSafeInteger(capacity) || capacity <= 0)
  ) {
    return EVENT_VALIDATION_ERRORS.capacityInvalid;
  }

  return null;
}
