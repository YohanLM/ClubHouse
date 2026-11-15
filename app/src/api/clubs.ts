// ID_008 Browse Clubs and ID_011 Follow Club
import { apiRequest } from './client';

export interface Club {
  id: number;
  name: string;
  category: string;
}

/** The active clubs in alphabetical order, or "Login required" without a token. */
export function fetchClubs(token: string | null) {
  return apiRequest<{ clubs: Club[] }>('/clubs', { token });
}

/** Ids of the clubs the logged-in user follows. */
export function fetchFollowedClubIds(token: string | null) {
  return apiRequest<{ clubIds: number[] }>('/follows', { token });
}

export interface FollowResult {
  /** "Club followed" or "Club already followed". */
  message: string;
  clubId: number;
  followerCount: number;
}

/** Follows the club; following it again is not an error. */
export function followClub(token: string | null, clubId: number) {
  return apiRequest<FollowResult>(`/clubs/${clubId}/follow`, { method: 'POST', token });
}
