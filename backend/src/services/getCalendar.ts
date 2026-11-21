// Events calendar service, for ID_019 View Upcoming Events Calendar.
// Lists the upcoming SCHEDULED events of all clubs in chronological order,
// optionally limited to a date range. Only logged-in users can see it.
import { PrismaClient } from '@prisma/client';
import { Clock, isValidDate, todayInMontreal } from './createEvent';

export const GET_CALENDAR_ERRORS = {
  loginRequired: 'Login required',
  invalidDate: 'Invalid date',
  invalidRange: 'End date must be after start date',
} as const;

export type GetCalendarError =
  (typeof GET_CALENDAR_ERRORS)[keyof typeof GET_CALENDAR_ERRORS];

export interface GetCalendarInput {
  /** Id of the logged-in account, or null when nobody is logged in. */
  actorId: number | null;
  /** First day of the range ("YYYY-MM-DD"), defaults to today. */
  from?: string | null;
  /** Last day of the range ("YYYY-MM-DD", inclusive), defaults to no limit. */
  to?: string | null;
}

export interface CalendarEvent {
  id: number;
  clubId: number;
  clubName: string;
  title: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  attendeeCount: number;
}

export type GetCalendarResult =
  | { success: true; events: CalendarEvent[] }
  | { success: false; message: GetCalendarError };

function fail(message: GetCalendarError): GetCalendarResult {
  return { success: false, message };
}

export async function getCalendar(
  input: GetCalendarInput,
  prisma: PrismaClient,
  clock: Clock = () => new Date()
): Promise<GetCalendarResult> {
  // 1. The user must be logged in with an existing account
  if (input.actorId == null) return fail(GET_CALENDAR_ERRORS.loginRequired);

  const actor = await prisma.account.findUnique({ where: { id: input.actorId } });
  if (!actor) return fail(GET_CALENDAR_ERRORS.loginRequired);

  // 2. The range must be made of valid dates, in order
  const from = input.from || null;
  const to = input.to || null;

  if ((from && !isValidDate(from)) || (to && !isValidDate(to))) {
    return fail(GET_CALENDAR_ERRORS.invalidDate);
  }
  if (from && to && to < from) return fail(GET_CALENDAR_ERRORS.invalidRange);

  // 3. Only upcoming events: the range never starts before today.
  //    "YYYY-MM-DD" strings compare in date order.
  const today = todayInMontreal(clock());
  const start = from && from > today ? from : today;

  const events = await prisma.event.findMany({
    where: {
      status: 'SCHEDULED',
      date: to ? { gte: start, lte: to } : { gte: start },
    },
    include: {
      club: { select: { name: true } },
      _count: {
        select: {
          rsvps: { where: { response: 'ATTENDING' } },
        },
      },
    },
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
      attendeeCount: event._count.rsvps,
    })),
  };
}
