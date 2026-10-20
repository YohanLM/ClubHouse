import { World, setWorldConstructor, type IWorldOptions } from '@cucumber/cucumber';
import type { Role } from '@prisma/client';
import type { CreateAccountInput, CreateAccountResult } from '../../backend/src/services/createAccount.ts';
import type { CreateEventInput, CreateEventResult } from '../../backend/src/services/createEvent.ts';
import type { ListedClub } from '../../backend/src/services/listClubs.ts';

export interface LoggedInUser {
  id: number;
  email: string;
  role: Role;
}

// State shared between the steps of one scenario. Cucumber creates a fresh
// World for every scenario, so nothing leaks between scenarios.
export class ClubHouseWorld extends World {
  /** The user the scenario acts as, or null when no user is logged in. */
  currentUser: LoggedInUser | null = null;

  /** The message issued by the last action (e.g. "Account created"). */
  message: string | null = null;

  registration?: CreateAccountInput;
  registrationResult?: CreateAccountResult;
  eventInput?: CreateEventInput;
  eventResult?: CreateEventResult;
  clubs: ListedClub[] = [];
  accountCountBefore = 0;
  clubCountBefore = 0;
  eventCountBefore = 0;
  currentDate?: Date;

  // The optional-profile/capacity clauses describe fields of the same form.
  // Submit once, after all When clauses, before the first outcome assertion.
  pendingSubmission?: () => Promise<void>;

  async submit(): Promise<void> {
    const action = this.pendingSubmission;
    this.pendingSubmission = undefined;
    if (action) await action();
  }

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(ClubHouseWorld);
