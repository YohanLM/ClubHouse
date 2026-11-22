// Demo data for running the app locally and for the sprint demo
// (npm run db:setup from the repo root). The data is in demoData.ts.
// Every account uses the password below. Running it again changes nothing.
import { prisma } from '../src/prisma';
import { todayInMontreal } from '../src/services/createEvent';
import { DEMO_PASSWORD, seedDemoData } from './demoData';

async function main() {
  const today = todayInMontreal(new Date());
  const { accounts, clubs, eventsCreated } = await seedDemoData(prisma, today);

  console.log(
    `Seeded ${accounts} accounts (password ${DEMO_PASSWORD}), ${clubs} clubs ` +
      `and ${eventsCreated} new events (dates relative to ${today}).`,
  );
}

main().finally(() => prisma.$disconnect());
