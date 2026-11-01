// The logged-in user, shared by every screen. After a successful POST /login,
// the Log In screen (T040) calls setSession({ token, ...session }); screens
// then send session.token with their API requests.
import { createContext, useContext, useState, type ReactNode } from 'react';

export interface Session {
  token: string;
  accountId: number;
  name: string;
  email: string;
  role: 'USER' | 'CLUB_OWNER' | 'ADMINISTRATOR';
}

interface SessionContextValue {
  /** null when nobody is logged in. */
  session: Session | null;
  setSession: (session: Session | null) => void;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  setSession: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  return (
    <SessionContext.Provider value={{ session, setSession }}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
