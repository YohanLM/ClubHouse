import { World, setWorldConstructor, type IWorldOptions } from '@cucumber/cucumber';
import type { Role } from '@prisma/client';

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

  /**
   * Type of the step being run ("Context" for Given, "Action" for When,
   * "Outcome" for Then; And/But take the type of the step before them).
   * Lets one step text both set up state and check it.
   */
  currentStepType: string | undefined = undefined;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(ClubHouseWorld);
