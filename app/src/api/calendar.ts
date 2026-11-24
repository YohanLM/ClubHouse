// ID_019 View Upcoming Events Calendar
import { apiRequest } from './client';

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

/** Upcoming scheduled events, optionally limited to an inclusive date range. */
export function fetchCalendar(token: string | null, from: string, to: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return apiRequest<{ events: CalendarEvent[] }>(
    `/events/calendar${query ? `?${query}` : ''}`,
    { token },
  );
}
