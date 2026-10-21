// Failed-attempt counter and temporary lock for ID_002 Log In (T020).
//
// The login service calls these helpers in this order:
//   1. isAccountLocked(account, now)        -> if true, reject with ACCOUNT_LOCKED_MESSAGE
//                                              WITHOUT checking the password
//   2. wrong password -> recordFailedLoginAttempt(account.id, prisma, now)
//   3. right password -> resetFailedLoginAttempts(account.id, prisma)
//
// Unknown emails have no account row, so nothing is counted for them.

import { PrismaClient } from '@prisma/client';

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCK_DURATION_MINUTES = 15;
export const ACCOUNT_LOCKED_MESSAGE = 'Account temporarily locked';

const LOCK_DURATION_MS = LOCK_DURATION_MINUTES * 60 * 1000;

export interface LockoutState {
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

export interface FailedAttemptResult extends LockoutState {
  /** True when this attempt locked the account (or it was already locked). */
  locked: boolean;
}

/** An account is locked while `lockedUntil` is in the future. */
export function isAccountLocked(
  account: Pick<LockoutState, 'lockedUntil'>,
  now: Date = new Date()
): boolean {
  return account.lockedUntil !== null && account.lockedUntil.getTime() > now.getTime();
}

/**
 * Pure transition: the lockout state after one more failed attempt.
 * - An expired lock is cleared first, so counting restarts at 1.
 * - Reaching MAX_FAILED_LOGIN_ATTEMPTS locks the account for LOCK_DURATION_MINUTES.
 * - Failures during an active lock do not extend it.
 */
export function nextLockoutState(current: LockoutState, now: Date = new Date()): FailedAttemptResult {
  if (isAccountLocked(current, now)) {
    return { ...current, locked: true };
  }

  const lockExpired = current.lockedUntil !== null;
  const failedLoginAttempts = (lockExpired ? 0 : current.failedLoginAttempts) + 1;

  if (failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    return {
      failedLoginAttempts,
      lockedUntil: new Date(now.getTime() + LOCK_DURATION_MS),
      locked: true,
    };
  }

  return { failedLoginAttempts, lockedUntil: null, locked: false };
}

/** Records one failed attempt for the account and locks it on the 5th. */
export async function recordFailedLoginAttempt(
  accountId: number,
  prisma: PrismaClient,
  now: Date = new Date()
): Promise<FailedAttemptResult> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { failedLoginAttempts: true, lockedUntil: true },
  });
  if (!account) throw new Error(`Account ${accountId} not found`);

  const next = nextLockoutState(account, now);

  await prisma.account.update({
    where: { id: accountId },
    data: { failedLoginAttempts: next.failedLoginAttempts, lockedUntil: next.lockedUntil },
  });

  return next;
}

/** Clears the counter and any lock after a successful login. */
export async function resetFailedLoginAttempts(
  accountId: number,
  prisma: PrismaClient
): Promise<void> {
  await prisma.account.update({
    where: { id: accountId },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
}
