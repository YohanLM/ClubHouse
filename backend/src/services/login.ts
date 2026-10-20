import type { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { normalizeEmail } from './registrationValidation';

export interface SessionUser {
  id: number;
  email: string;
  role: Role;
}

export const LOGIN_FAILURE_LIMIT = 5;
export const LOGIN_LOCK_MS = 15 * 60 * 1000;

export type LoginResult =
  | { success: true; message: 'Login successful'; user: SessionUser }
  | { success: false; message: string };

/** Returns the authenticated identity for the caller's session, never a password hash. */
export async function login(
  input: { email?: string | null; password?: string | null },
  prisma: PrismaClient,
  now: () => Date = () => new Date(),
): Promise<LoginResult> {
  if (!input.email?.trim()) return { success: false, message: 'Email is required' };
  if (!input.password) return { success: false, message: 'Password is required' };
  const email = normalizeEmail(input.email);
  const password = input.password;

  // Serialize counter/lock changes with authentication so failures cannot be lost.
  return prisma.$transaction(async (tx) => {
    const account = await tx.account.findUnique({ where: { email } });
    if (!account) return { success: false, message: 'Invalid email or password' };
    const currentTime = now();
    if (account.lockedUntil && account.lockedUntil > currentTime) {
      return { success: false, message: 'Account temporarily locked' };
    }
    const priorFailures = account.lockedUntil ? 0 : account.failedLoginAttempts;
    if (!(await bcrypt.compare(password, account.passwordHash))) {
      const attempts = priorFailures + 1;
      const locked = attempts >= LOGIN_FAILURE_LIMIT;
      await tx.account.update({
        where: { id: account.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: locked ? new Date(currentTime.getTime() + LOGIN_LOCK_MS) : null,
        },
      });
      return {
        success: false,
        message: locked ? 'Account temporarily locked' : 'Invalid email or password',
      };
    }
    await tx.account.update({
      where: { id: account.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
    return {
      success: true,
      message: 'Login successful',
      user: { id: account.id, email: account.email, role: account.role },
    };
  });
}
