// Calls the ClubHouse HTTP API (backend/src/api, started with `npm run api`).
// On a phone or an Android emulator, localhost is the device itself: set
// EXPO_PUBLIC_API_URL to your computer's address, e.g. http://192.168.0.12:3000
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

/** Same shape as the service results: the data, or the error message. */
export type ApiResult<T> = ({ success: true } & T) | { success: false; message: string };

interface RequestOptions {
  method?: 'GET' | 'POST';
  /** Session token of the logged-in user, if any. */
  token?: string | null;
  /** Sent as JSON. */
  body?: unknown;
}

/** Never throws: a network failure is returned as a message too. */
export async function apiRequest<T>(
  path: string,
  { method = 'GET', token, body }: RequestOptions = {},
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return { success: false, message: 'Cannot reach the ClubHouse server' };
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { success: false, message: data.message ?? 'Something went wrong' };
  return { success: true, ...data };
}
