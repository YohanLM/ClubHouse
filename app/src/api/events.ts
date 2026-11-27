// ID_016 Edit Event (T065)
import { apiRequest } from './client';

/** A scheduled event of one of the logged-in Club Owner's clubs. */
export interface OwnedEvent {
  id: number;
  clubId: number;
  clubName: string;
  title: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number | null;
}

/** Fields to change; omitted fields stay the same, capacity null removes the limit. */
export type EventChanges = Partial<
  Pick<OwnedEvent, 'title' | 'category' | 'date' | 'startTime' | 'endTime' | 'location' | 'capacity'>
>;

/** The scheduled events the logged-in Club Owner can edit. */
export function fetchOwnedEvents(token: string | null) {
  return apiRequest<{ events: OwnedEvent[] }>('/events/owned', { token });
}

/** Saves the changes; the result message is "Event updated" or the error. */
export function updateEvent(token: string | null, eventId: number, changes: EventChanges) {
  return apiRequest<{ message: string; event: OwnedEvent }>(`/events/${eventId}`, {
    method: 'PATCH',
    token,
    body: changes,
  });
}

/** ID_017 (T071): cancels the event; a blank reason is sent as none. */
export function cancelEvent(token: string | null, eventId: number, reason: string) {
  return apiRequest<{ message: string }>(`/events/${eventId}/cancel`, {
    method: 'POST',
    token,
    body: { reason: reason.trim() || null },
  });
}
