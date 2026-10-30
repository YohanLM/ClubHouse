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

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(ClubHouseWorld);
