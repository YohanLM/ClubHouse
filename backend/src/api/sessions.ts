// Login sessions of the HTTP API. POST /login hands out a token, and the app
// sends it back in an "Authorization: Bearer <token>" header. Sessions are
// kept in memory, so everyone has to log in again when the server restarts.
import { randomBytes } from 'node:crypto';
import type { Session } from '../services/login';

export class SessionStore {
  private readonly sessions = new Map<string, Session>();

  /** Stores the session and returns its new token. */
  create(session: Session): string {
    const token = randomBytes(32).toString('hex');
    this.sessions.set(token, session);
    return token;
  }

  /** The session of the token, or null when the token is missing or unknown. */
  get(token: string | undefined): Session | null {
    return (token && this.sessions.get(token)) || null;
  }
}
