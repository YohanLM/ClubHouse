// ID_008 Browse Clubs
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
