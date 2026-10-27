// Log In service for ID_002.
// Emails are matched case-insensitively (they are stored lowercase), the
// password is checked against the bcrypt hash, and a successful login
// returns a session holding the account's role. Five consecutive failed
// attempts lock the account temporarily.
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { normalizeEmail } from './registrationValidation.ts';

export const LOGIN_ERRORS = {
  emailRequired: 'Email is required',
  passwordRequired: 'Password is required',
  invalidCredentials: 'Invalid email or password',
  accountLocked: 'Account temporarily locked',
} as const;

export type LoginError = (typeof LOGIN_ERRORS)[keyof typeof LOGIN_ERRORS];

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export interface LoginInput {
  email?: string | null;
  password?: string | null;
}

// The logged-in user (never includes passwordHash)
export interface Session {
  accountId: number;
  name: string;
  email: string;
  role: Role;
}

export type LoginResult =
  | {
      success: true;
      message: 'Login successful';
      session: Session;
    }
  | {
      success: false;
      message: LoginError;
    };

function fail(message: LoginError): LoginResult {
  return { success: false, message };
}

// Log in with email and password using Prisma
export async function login(
  input: LoginInput,
  prisma: PrismaClient,
  now: Date = new Date()
): Promise<LoginResult> {

  // 1. Both fields are required
  if (!input.email || input.email.trim() === '') return fail(LOGIN_ERRORS.emailRequired);
  if (!input.password) return fail(LOGIN_ERRORS.passwordRequired);

  // 2. Find the account by its normalized (lowercase) email
  const account = await prisma.account.findUnique({
    where: { email: normalizeEmail(input.email) },
  });

  // Same message for unknown email and wrong password
  if (!account) return fail(LOGIN_ERRORS.invalidCredentials);

  // 3. Refuse while the account is locked, even with the right password
  const lockActive = account.lockedUntil !== null && account.lockedUntil > now;
  if (lockActive) return fail(LOGIN_ERRORS.accountLocked);

  // 4. Check the password
  const passwordMatches = await bcrypt.compare(input.password, account.passwordHash);

  if (!passwordMatches) {
    // An expired lock starts a fresh count
    const previousAttempts = account.lockedUntil !== null ? 0 : account.failedLoginAttempts;
    const failedLoginAttempts = previousAttempts + 1;
    const locks = failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS;

    await prisma.account.update({
      where: { id: account.id },
      data: {
        failedLoginAttempts,
        lockedUntil: locks ? new Date(now.getTime() + LOCKOUT_DURATION_MS) : null,
      },
    });

    return fail(locks ? LOGIN_ERRORS.accountLocked : LOGIN_ERRORS.invalidCredentials);
  }

  // 5. Successful login resets the failed attempt counter
  if (account.failedLoginAttempts !== 0 || account.lockedUntil !== null) {
    await prisma.account.update({
      where: { id: account.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  // 6. Return the session with the account's role
  return {
    success: true,
    message: 'Login successful',
    session: {
      accountId: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
    },
  };
}
