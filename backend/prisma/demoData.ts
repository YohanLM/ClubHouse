// Demo data for the sprint demo (T093): accounts, clubs and events that let
// every implemented story be shown (ID_001 to ID_020). It uses the people and
// clubs of the feature files. RSVPs and follows are added by T108.
//
// Event dates are relative to the day the seed runs, so the upcoming events
// are still upcoming on the day of the demo.
import bcrypt from 'bcryptjs';
import type { ClubStatus, EventStatus, PrismaClient, Role } from '@prisma/client';

/** Password of every demo account. */
export const DEMO_PASSWORD = 'Passw0rd!23';

export const DEMO_ACCOUNTS: { name: string; email: string; role: Role }[] = [
  { name: 'ClubHouse Admin', email: 'admin.clubhouse@mcgill.ca', role: 'ADMINISTRATOR' },
  { name: 'Alice Tremblay', email: 'alice.tremblay@mail.mcgill.ca', role: 'USER' },
  { name: 'Bob Chen', email: 'bob.chen@mcgill.ca', role: 'USER' },
  { name: 'Dana Lee', email: 'dana.lee@mail.mcgill.ca', role: 'CLUB_OWNER' },
  { name: 'Evan Roy', email: 'evan.roy@mail.mcgill.ca', role: 'CLUB_OWNER' },
];

export const DEMO_CLUBS: { name: string; category: string; status: ClubStatus; ownerEmail: string }[] = [
  { name: 'Robotics Club', category: 'Academic', status: 'ACTIVE', ownerEmail: 'dana.lee@mail.mcgill.ca' },
  { name: 'Debate Union', category: 'Academic', status: 'ACTIVE', ownerEmail: 'dana.lee@mail.mcgill.ca' },
  { name: 'Jazz Society', category: 'Arts', status: 'ACTIVE', ownerEmail: 'evan.roy@mail.mcgill.ca' },
  { name: 'Ski Club', category: 'Sports', status: 'INACTIVE', ownerEmail: 'evan.roy@mail.mcgill.ca' },
];

interface DemoEvent {
  clubName: string;
  title: string;
  category: string;
  /** Days after the seed date (negative: in the past). */
  inDays: number;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number | null;
  status: EventStatus;
  cancellationReason?: string;
}

export const DEMO_EVENTS: DemoEvent[] = [
  // Dana Lee's clubs: edit (ID_016), cancel (ID_017) and RSVP (ID_020) demos
  { clubName: 'Robotics Club', title: 'Robotics Workshop', category: 'Academic', inDays: 3, startTime: '18:00', endTime: '20:00', location: 'McConnell 103', capacity: 30, status: 'SCHEDULED' },
  { clubName: 'Robotics Club', title: 'Arduino Hack Night', category: 'Academic', inDays: 10, startTime: '19:00', endTime: '22:00', location: 'Trottier 0060', capacity: 2, status: 'SCHEDULED' },
  { clubName: 'Robotics Club', title: 'Demo Night', category: 'Social', inDays: 17, startTime: '19:00', endTime: '21:00', location: 'McConnell 103', capacity: null, status: 'CANCELLED', cancellationReason: 'Lab closed for maintenance' },
  { clubName: 'Robotics Club', title: 'Robotics Kickoff', category: 'Academic', inDays: -30, startTime: '18:00', endTime: '20:00', location: 'McConnell 103', capacity: null, status: 'COMPLETED' },
  { clubName: 'Debate Union', title: 'Debate Finals', category: 'Academic', inDays: 5, startTime: '17:00', endTime: '19:00', location: 'Leacock 132', capacity: 120, status: 'SCHEDULED' },
  { clubName: 'Debate Union', title: 'Public Speaking Workshop', category: 'Academic', inDays: 21, startTime: '18:00', endTime: '19:30', location: 'Bronfman 245', capacity: 25, status: 'SCHEDULED' },
  // Evan Roy's club: same day as Debate Finals, later start (calendar order, ID_019)
  { clubName: 'Jazz Society', title: 'Jazz Night', category: 'Arts', inDays: 5, startTime: '19:00', endTime: '22:00', location: 'Gerts Bar', capacity: null, status: 'SCHEDULED' },
  { clubName: 'Jazz Society', title: 'Open Jam Session', category: 'Arts', inDays: 12, startTime: '20:00', endTime: '23:00', location: 'Strathcona Music Building', capacity: 40, status: 'SCHEDULED' },
];

/** "2026-11-22" + 3 -> "2026-11-25" */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export interface SeedSummary {
  accounts: number;
  clubs: number;
  /** Events created by this run (existing ones are left as they are). */
  eventsCreated: number;
}

/**
 * Adds the demo data. Running it again changes nothing: existing accounts,
 * clubs and events (same club and title) are kept as they are.
 * @param today the seed date, "YYYY-MM-DD"
 */
export async function seedDemoData(prisma: PrismaClient, today: string): Promise<SeedSummary> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const accountIds = new Map<string, number>();
  for (const account of DEMO_ACCOUNTS) {
    const saved = await prisma.account.upsert({
      where: { email: account.email },
      create: { ...account, passwordHash },
      update: {},
    });
    accountIds.set(saved.email, saved.id);
  }

  const clubIds = new Map<string, number>();
  for (const { ownerEmail, ...club } of DEMO_CLUBS) {
    const saved = await prisma.club.upsert({
      where: { name: club.name },
      create: { ...club, ownerId: accountIds.get(ownerEmail)! },
      update: {},
    });
    clubIds.set(saved.name, saved.id);
  }

  let eventsCreated = 0;
  for (const { clubName, inDays, cancellationReason, ...event } of DEMO_EVENTS) {
    const clubId = clubIds.get(clubName)!;
    const existing = await prisma.event.findFirst({ where: { clubId, title: event.title } });
    if (existing) continue;

    await prisma.event.create({
      data: {
        ...event,
        clubId,
        date: addDays(today, inDays),
        cancellationReason: cancellationReason ?? null,
      },
    });
    eventsCreated++;
  }

  return { accounts: DEMO_ACCOUNTS.length, clubs: DEMO_CLUBS.length, eventsCreated };
}
